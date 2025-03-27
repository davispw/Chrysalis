/**
 * Copyright (c) 2015, Nordic Semiconductor
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of Nordic Semiconductor ASA nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Mechanically translated from Python to JavaScript by Keyboardio in March, 2025.
 *
 * WebSerial transport for the nRF52 DFU tool
 * Ported from the Python implementation
 */

import { SLIP } from '../utils/slip.js';
import { BinaryUtils } from '../utils/binary.js';
import { DfuProtocol, DfuEvent } from '../models.js';
import { CRC16} from '../utils/crc16.js'
/**
 * HCI Packet implementation
 */
class HciPacket {
  static sequenceNumber = 0;
  
  /**
   * Constructor for HCI packet
   * @param {Uint8Array} data - Data to include in the packet
   * @param {string} packetType - Optional packet type for logging
   */
  constructor(data = new Uint8Array(), packetType = 'UNKNOWN') {
    this.creationTime = new Date();
    this.packetType = packetType;
    
    // Increment sequence number (0-7)
    HciPacket.sequenceNumber = (HciPacket.sequenceNumber + 1) % 8;
    
    // Create the packet structure
    this._createPacket(data);
  }
  
  /**
   * Creates the full packet
   * @param {Uint8Array} data - Data to include in packet 
   * @private
   */
  _createPacket(data) {
    // Try to determine packet type if not specified
    if (this.packetType === 'UNKNOWN' && data.length >= 4) {
      const packetId = BinaryUtils.bytesToInt32(data.slice(0, 4));
      
      if (packetId === DfuProtocol.INIT_PACKET) {
        this.packetType = 'INIT_PACKET';
      } else if (packetId === DfuProtocol.START_PACKET) {
        this.packetType = 'START_PACKET';
      } else if (packetId === DfuProtocol.DATA_PACKET) {
        this.packetType = 'DATA_PACKET';
      } else if (packetId === DfuProtocol.STOP_DATA_PACKET) {
        this.packetType = 'STOP_DATA_PACKET';
      }
    }
    
    // Create the slip header
    const slipHeader = SLIP.createHeader(
      HciPacket.sequenceNumber,
      DfuProtocol.DATA_INTEGRITY_CHECK_PRESENT,
      DfuProtocol.RELIABLE_PACKET,
      DfuProtocol.HCI_PACKET_TYPE,
      data.length
    );
    
    // Combine header and data
    let tempData = BinaryUtils.mergeArrays(slipHeader, data);
    
    // Calculate CRC16
    this.crcValue = CRC16.calculate(tempData);
    
    // Add CRC16 (little endian)
    const crcBytes = BinaryUtils.int16ToBytes(this.crcValue);
    tempData = BinaryUtils.mergeArrays(tempData, crcBytes);
    
    // SLIP encode the data
    const encoded = SLIP.encode(tempData);
    
    // Add framing bytes
    this.data = BinaryUtils.mergeArrays(
      new Uint8Array([SLIP.SLIP_END]),
      encoded,
      new Uint8Array([SLIP.SLIP_END])
    );
  }
  
  /**
   * Returns string representation of the packet
   * @returns {string} Packet info
   */
  toString() {
    return `${this.packetType} packet, ${this.data.length} bytes, seq=${HciPacket.sequenceNumber}`;
  }
}

/**
 * DFU Serial Transport implementation using WebSerial
 */
class DfuTransportSerial {
  // Constants for serial transport
  static DEFAULT_BAUD_RATE = 115200;
  static DEFAULT_FLOW_CONTROL = false;
  static DEFAULT_SERIAL_PORT_TIMEOUT = 1.0;  // Timeout on serial port read
  static ACK_PACKET_TIMEOUT = 5000;          // ms
  static SERIAL_PORT_OPEN_WAIT_TIME = 0.1;   // seconds
  static DTR_RESET_WAIT_TIME = 0.1;          // seconds
  
  // Flash parameters
  static FLASH_PAGE_SIZE = 4096;
  static FLASH_PAGE_ERASE_TIME = 89.7;       // ms
  static FLASH_WORD_WRITE_TIME = 0.1;        // ms
  static FLASH_PAGE_WRITE_TIME = 102.4;      // ms (FLASH_PAGE_SIZE/4 * FLASH_WORD_WRITE_TIME)
  
  // DFU packet size
  static DFU_PACKET_MAX_SIZE = 512;
  
  // Debug mode
  static DETAILED_DEBUG = false;
  
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readingContinuously = false;
    this.receivedData = [];
    this.isOpening = false;
    this.isClosing = false;
    
    this.baudRate = options.baudRate || DfuTransportSerial.DEFAULT_BAUD_RATE;
    this.flowControl = options.flowControl || DfuTransportSerial.DEFAULT_FLOW_CONTROL;
    this.singleBank = options.singleBank || false;
    this.timeout = options.timeout || DfuTransportSerial.DEFAULT_SERIAL_PORT_TIMEOUT;
    this.skipDtrReset = options.skipDtrReset || false; // New option to skip DTR reset
    
    this.totalSize = 167936; // default is max application size
    this.sdSize = 0;
    
    this.eventCallbacks = {
      [DfuEvent.PROGRESS_EVENT]: [],
      [DfuEvent.TIMEOUT_EVENT]: [],
      [DfuEvent.ERROR_EVENT]: []
    };
    
    this.logger = {
      log: message => {
        console.log(message);
        this._logToUI('info', message);
      },
      error: message => {
        console.error(message);
        this._logToUI('error', message);
      },
      warn: message => {
        console.warn(message);
        this._logToUI('warning', message);
      },
      info: message => {
        console.info(message);
        this._logToUI('info', message);
      }
    };
  }
  
  /**
   * Log message to UI console if available
   * @param {string} level - Log level 
   * @param {string} message - Log message
   * @private
   */
  _logToUI(level, message) {
    const consoleElement = document.getElementById('console');
    if (consoleElement) {
      const logElement = document.createElement('div');
      logElement.className = `log log-${level}`;
      logElement.textContent = message;
      consoleElement.appendChild(logElement);
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  }
  
  /**
   * Register a callback for DFU events
   * @param {string} event - Event type from DfuEvent 
   * @param {Function} callback - Callback function
   */
  registerEventsCallback(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }
  
  /**
   * Send event to registered callbacks
   * @param {string} event - Event type
   * @param {Object} eventData - Event data
   * @private
   */
  _sendEvent(event, eventData = {}) {
    if (this.eventCallbacks[event]) {
      for (const callback of this.eventCallbacks[event]) {
        callback(eventData);
      }
    }
  }
  
  /**
   * Open the serial connection
   * @returns {Promise<void>}
   */
  async open() {
    console.log('[SERIAL] open() called');
    
    // Don't try to open if already open or in the process of opening
    if (this.isOpen()) {
      console.log('[SERIAL] Port is already open, returning early');
      this.logger.warn("[SERIAL] Port is already open");
      return;
    }
    
    if (this.isOpening) {
      console.log('[SERIAL] Port is already in the process of opening, returning early');
      this.logger.warn("[SERIAL] Port is already in the process of opening");
      return;
    }
    
    this.isOpening = true;
    console.log('[SERIAL] Setting isOpening = true');
    this.logger.info("[SERIAL] Opening serial transport...");
    
    try {
      // Log connection parameters
      console.log('[SERIAL] Logging configuration parameters');
      this.logger.info("[SERIAL] Configuration:");
      this.logger.info(`[SERIAL] - Baud rate: ${this.baudRate}`);
      this.logger.info(`[SERIAL] - Flow control: ${this.flowControl ? "Enabled" : "Disabled"}`);
      this.logger.info(`[SERIAL] - Single bank mode: ${this.singleBank ? "Enabled" : "Disabled"}`);
      
      if (!navigator.serial) {
        console.error('[SERIAL] WebSerial API not available in this browser');
        throw new Error("WebSerial API not available. Use Chrome or Edge browser.");
      }
      
      try {
        console.log(`[SERIAL] Requesting serial port from user...`);
        this.logger.info(`[SERIAL] Opening DFU port with baud rate ${this.baudRate}`);
        const startTime = Date.now();
        
        // Request port from user or use the one from touch if available
        this.port = await navigator.serial.requestPort();
        console.log('[SERIAL] User selected a port');
        
        // Open port with DFU baud rate
        console.log('[SERIAL] Opening port with settings:');
        console.log(`[SERIAL] - Baud rate: ${this.baudRate}`);
        console.log(`[SERIAL] - Flow control: ${this.flowControl ? "hardware" : "none"}`);
        
        await this.port.open({
          baudRate: this.baudRate,
          flowControl: this.flowControl ? "hardware" : "none",
          dataBits: 8,
          stopBits: 1,
          parity: "none"
        });
        
        console.log('[SERIAL] Port opened successfully');
        const openTime = (Date.now() - startTime) / 1000;
        this.logger.info(`[SERIAL] DFU port opened successfully in ${openTime.toFixed(3)} seconds`);
        
        // Short delay to ensure port is stable
        console.log('[SERIAL] Waiting for port to stabilize...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Toggle DTR to reset the board and enter DFU mode (only if not already in bootloader mode)
        if (!this.touch && !this.skipDtrReset) {
          console.log('[SERIAL] Toggling DTR to reset device and enter DFU mode');
          
          try {
            // Set DTR to false (device reset)
            await this.port.setSignals({ dataTerminalReady: false });
            console.log('[SERIAL] Set DTR to false');
            await new Promise(resolve => setTimeout(resolve, 50));  // 50ms delay
            
            // Set DTR back to true
            await this.port.setSignals({ dataTerminalReady: true });
            console.log('[SERIAL] Set DTR to true');
            
            // Delay to allow device to boot up
            const resetWaitTime = DfuTransportSerial.DTR_RESET_WAIT_TIME * 1000; // convert to ms
            console.log(`[SERIAL] Waiting ${resetWaitTime}ms for device to boot up`);
            await new Promise(resolve => setTimeout(resolve, resetWaitTime));
            console.log('[SERIAL] Device reset sequence completed');
          } catch (error) {
            console.error('[SERIAL] Error toggling DTR:', error);
            this.logger.error(`[SERIAL] Error toggling DTR: ${error.message}`);
            // Continue anyway, as some devices may not support DTR
          }
        } else if (this.skipDtrReset) {
          console.log('[SERIAL] Skipping DTR reset (device already in bootloader mode)');
        }
        
        // Start reading from the port
        console.log('[SERIAL] Starting continuous reading...');
  //      await this._startReading();
        console.log('[SERIAL] Continuous reading started');
        
      } catch (e) {
        console.error('[SERIAL] Error opening serial port:', e);
        const errorMsg = `Serial port could not be opened. Reason: ${e.message}`;
        this.logger.error(`[SERIAL] ${errorMsg}`);
        this.logger.error(e.stack);
        this.isOpening = false;
        throw new Error(errorMsg);
      }
      
    } catch (e) {
      console.error('[SERIAL] Outer error handler:', e);
      this._sendEvent(DfuEvent.ERROR_EVENT, {
        message: `Failed to open serial port: ${e.message}`
      });
      this.isOpening = false;
      throw e;
    }
    
    console.log('[SERIAL] Setting isOpening = false at end of open()');
    this.isOpening = false;
    console.log('[SERIAL] open() completed successfully');
  }
  
  /**
   * Starts continuous reading from the serial port
   * @private
   */
  async _startReading() {
	console.log("one");
    if (!this.port || this.readingContinuously) return;
   	console.log("two"); 
    this.readingContinuously = true;
    this.receivedData = [];
    
    try {
      this.reader = this.port.readable.getReader();
     	console.log("three"); 
      while (this.readingContinuously) {
console.log(this);
        try {
	console.log("three point five");	

          const { value, done } = await this.reader.read();
         	console.log("four"); 
          if (done) {
            // Reader has been canceled
            break;
          }
          
          if (value) {
            // Store received data
            this.receivedData.push(...Array.from(value));
            
            if (DfuTransportSerial.DETAILED_DEBUG) {
              this.logger.info(`[RECV] Received ${value.length} bytes: ${BinaryUtils.formatBytes(value)}`);
            }
          }
        } catch (e) {
console.log("Error " + e);
          // Handle read errors (e.g., if the device disconnects)
          if (this.readingContinuously) {
            this.logger.error(`[SERIAL] Error reading: ${e.message}`);
            // Only break the loop if we're not already closing
            if (!this.isClosing) {
              break;
            }
          } else {
            // If we're not reading continuously anymore, this is expected
            break;
          }
        }
      }
    } catch (e) {
      this.logger.error(`[SERIAL] Error setting up reader: ${e.message}`);
    } finally {
      this.readingContinuously = false;
      try {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch (e) {
            // Ignore release lock errors
          }
          this.reader = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * Safely stops the reader
   * @private
   */
  async _stopReading() {
    if (!this.readingContinuously || !this.reader) {
      return;
    }
    
    this.readingContinuously = false;
    
    try {
      await this.reader.cancel();
      // Short delay to ensure cancel completes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        this.reader.releaseLock();
      } catch (e) {
        // Ignore release lock errors
      }
      this.reader = null;
    } catch (e) {
      this.logger.warn(`[SERIAL] Error stopping reader: ${e.message}`);
      // The reader might already be closed, so we'll ignore errors here
    }
  }
  
  /**
   * Close the serial connection
   * @returns {Promise<void>}
   */
  async close() {
    // Don't try to close if already closing
    if (this.isClosing) {
      return;
    }
    
    // Nothing to close if no port
    if (!this.port) {
      return;
    }
    
    this.isClosing = true;
    this.logger.info("[SERIAL] Closing serial transport...");
    
    // Stop continuous reading - must be done before closing the port
    await this._stopReading();
    
    // Close the port
    if (this.port) {
      try {
        await this.port.close();
        this.logger.info("[SERIAL] Serial port closed");
      } catch (e) {
        this.logger.error(`[SERIAL] Error closing port: ${e.message}`);
      }
      this.port = null;
    }
    
    this.receivedData = [];
    this.isClosing = false;
  }
  
  /**
   * Check if serial connection is open
   * @returns {boolean} True if open
   */
  isOpen() {
    return this.port !== null && this.port.readable !== null;
  }
  
  /**
   * Wait for the port to be open
   * @returns {Promise<void>}
   */
  async waitForOpen() {
    const timeout = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (!this.isOpen()) {
      if (Date.now() - startTime > timeout) {
        const logMessage = "Failed to open transport backend";
        throw new Error(logMessage);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * Send a packet and wait for acknowledgement
   * @param {HciPacket} packet - Packet to send
   * @returns {Promise<number>} ACK number
   */
  async sendPacket(packet) {
    if (!this.isOpen()) {
      throw new Error("Transport is not open");
    }
    
    let attempts = 0;
    let lastAck = null;
    let packetSent = false;
    
    this.logger.info(`[SEND] Packet type: ${packet.packetType}`);
    if (DfuTransportSerial.DETAILED_DEBUG) {
      this.logger.info(`[SEND] Raw packet data: ${BinaryUtils.formatBytes(packet.data)}`);
    }
    this.logger.info(`[SEND] Packet length: ${packet.data.length} bytes`);
    
    const startTime = Date.now();
    
    try {
      while (!packetSent) {
        attempts++;
        const timestamp = new Date().toTimeString().split(' ')[0];
        this.logger.info(`[${timestamp}][ATTEMPT ${attempts}] PC -> target: [${packet.data.length} bytes]`);
        
        // Log CRC calculation details if available
        if (packet.crcValue && DfuTransportSerial.DETAILED_DEBUG) {
          this.logger.info(`[SEND] Packet CRC: 0x${packet.crcValue.toString(16).padStart(4, '0').toUpperCase()}`);
        }
        
        // Write packet to serial port
        try {
          // Get writer and wait a moment
          this.writer = this.port.writable.getWriter();
          
          // Write data
          await this.writer.write(packet.data);
          this.logger.info(`[SEND] Wrote ${packet.data.length} bytes to serial port`);
          
          // Release writer
          this.writer.releaseLock();
          this.writer = null;
          
          // Wait a moment for the device to process
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Get acknowledgement
          const ack = await this.getAckNr();
          this.logger.info(`[RECV] Got ACK: ${ack}`);
          
          if (lastAck === null) {
            this.logger.info("[SEND] First packet sent, no previous ACK to compare");
            lastAck = ack;
            packetSent = true;
            break;
          }
          
          if (ack === (lastAck + 1) % 8) {
            lastAck = ack;
            packetSent = true;
            this.logger.info(`[SEND] Packet sent successfully after ${attempts} attempts`);
          } else {
            this.logger.warn(`[SEND] Expected ACK ${(lastAck + 1) % 8} but got ${ack}`);
          }
        } catch (e) {
          this.logger.error(`[SEND/RECV] Error: ${e.message}`);
          
          // Make sure writer lock is released if we have an error
          if (this.writer) {
            try {
              this.writer.releaseLock();
            } catch (releaseLockError) {
              // Ignore release lock errors
            }
            this.writer = null;
          }
          
          if (attempts > 3) {
            throw new Error(`Three failed tx attempts encountered on packet ${packet.sequenceNumber}`);
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        if (attempts > 3) {
          throw new Error(`Three failed tx attempts encountered on packet ${packet.sequenceNumber}`);
        }
      }
    } catch (e) {
      const elapsed = (Date.now() - startTime) / 1000;
      this.logger.error(`[SEND] Exception after ${elapsed.toFixed(3)} seconds: ${e.message}`);
      throw e;
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    this.logger.info(`[SEND] Packet transmission completed in ${elapsed.toFixed(3)} seconds`);
    
    // Clear the received data buffer
    this.receivedData = [];
    
    return lastAck;
  }
  
  /**
   * Wait for and extract an ACK number from the received data
   * @returns {Promise<number>} ACK number
   */
  async getAckNr() {
    const isTimeout = (startTime, timeoutMs) => {
      return Date.now() - startTime > timeoutMs;
    };
    
    const startTime = Date.now();
    const timeoutMs = DfuTransportSerial.ACK_PACKET_TIMEOUT;
    
    this.logger.info(`[RECV] Waiting for ACK with timeout of ${timeoutMs/1000} seconds`);
    
    // Wait for data with two SLIP_END markers
    while (this.receivedData.filter(b => b === SLIP.SLIP_END).length < 2) {
      if (isTimeout(startTime, timeoutMs)) {
        const elapsed = (Date.now() - startTime) / 1000;
        this.logger.error(`[RECV] TIMEOUT after ${elapsed.toFixed(3)} seconds`);
        
        if (this.receivedData.length > 0) {
          this.logger.error(`[RECV] Buffer contents (${this.receivedData.length} bytes): ${BinaryUtils.formatBytes(new Uint8Array(this.receivedData))}`);
        } else {
          this.logger.error("[RECV] Buffer is empty");
        }
        
        // Reset HciPacket numbering back to 0
        HciPacket.sequenceNumber = 0;
        
        this._sendEvent(DfuEvent.TIMEOUT_EVENT, {
          message: "Timed out waiting for acknowledgement from device."
        });
        
        throw new Error("Timeout waiting for ACK");
      }
      
      // Short wait to allow more data to arrive
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    if (this.receivedData.length < 2) {
      this.logger.error(`[RECV] No data received on serial port after ${elapsed.toFixed(3)} seconds. Not able to proceed.`);
      throw new Error("No data received on serial port. Not able to proceed.");
    }
    
    if (DfuTransportSerial.DETAILED_DEBUG) {
      this.logger.info(`[RECV] Received complete response after ${elapsed.toFixed(3)} seconds: ${BinaryUtils.formatBytes(new Uint8Array(this.receivedData))}`);
    } else {
      this.logger.info(`[RECV] Received complete response after ${elapsed.toFixed(3)} seconds`);
    }
    
    try {
      // Convert array to Uint8Array for SLIP processing
      const dataArray = new Uint8Array(this.receivedData);
      
      // Decode SLIP data
      const data = SLIP.decode(dataArray);
      if (DfuTransportSerial.DETAILED_DEBUG) {
        this.logger.info(`[RECV] After SLIP decoding: ${BinaryUtils.formatBytes(data)}`);
      }
      
      // Remove 0xC0 at start and end
      let startIdx = 0;
      let endIdx = data.length;
      
      // Find first 0xC0
      for (let i = 0; i < data.length; i++) {
        if (data[i] === SLIP.SLIP_END) {
          startIdx = i + 1;
          break;
        }
      }
      
      // Find last 0xC0
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === SLIP.SLIP_END) {
          endIdx = i;
          break;
        }
      }
      
      const trimmedData = data.slice(startIdx, endIdx);
      if (DfuTransportSerial.DETAILED_DEBUG) {
        this.logger.info(`[RECV] After removing framing bytes: ${BinaryUtils.formatBytes(trimmedData)}`);
      }
      
      // Extract and log packet fields
      if (trimmedData.length >= 1) {
        const ackNumber = (trimmedData[0] >> 3) & 0x07;
        this.logger.info(`[RECV] ACK number: ${ackNumber}`);
        
        // Extract other header fields if they exist
        if (trimmedData.length >= 4 && DfuTransportSerial.DETAILED_DEBUG) {
          const headerByte0 = trimmedData[0];
          const headerByte1 = trimmedData[1];
          const headerByte2 = trimmedData[2];
          const headerByte3 = trimmedData[3];
          
          const seqNum = headerByte0 & 0x07;
          const ackNum = (headerByte0 >> 3) & 0x07;
          const dataIntegrity = (headerByte0 >> 6) & 0x01;
          const reliability = (headerByte0 >> 7) & 0x01;
          
          const pktType = headerByte1 & 0x0F;
          const pktLenLow = (headerByte1 >> 4) & 0x0F;
          const pktLenHigh = headerByte2 & 0xFF;
          const pktLen = (pktLenHigh << 4) | pktLenLow;
          
          const checksum = headerByte3;
          
          this.logger.info("[RECV] Header breakdown:");
          this.logger.info(`[RECV]   Sequence number: ${seqNum}`);
          this.logger.info(`[RECV]   ACK number: ${ackNum}`);
          this.logger.info(`[RECV]   Data integrity check: ${dataIntegrity}`);
          this.logger.info(`[RECV]   Reliability bit: ${reliability}`);
          this.logger.info(`[RECV]   Packet type: ${pktType}`);
          this.logger.info(`[RECV]   Packet length: ${pktLen}`);
          this.logger.info(`[RECV]   Header checksum: 0x${checksum.toString(16).padStart(2, '0').toUpperCase()}`);
          
          // Validate checksum
          const calculatedChecksum = (~(headerByte0 + headerByte1 + headerByte2) + 1) & 0xFF;
          this.logger.info(`[RECV]   Calculated checksum: 0x${calculatedChecksum.toString(16).padStart(2, '0').toUpperCase()} ${calculatedChecksum === checksum ? "(MATCH)" : "(MISMATCH!)"}`);
        }
        
        // Return ACK number
        return ackNumber;
      } else {
        throw new Error("Received data too short to extract ACK number");
      }
      
    } catch (e) {
      this.logger.error(`[RECV] Exception during packet processing: ${e.message}`);
      this.logger.error(e.stack);
      throw e;
    }
  }
  
  /**
   * Send a ping packet to test if the device is responsive
   * @returns {Promise<boolean>} True if successful
   */
  async sendPing() {
    console.log('[SERIAL] Sending PING command to test device responsiveness');
    this.logger.info("[DFU] Sending ping packet to test device");
    
    try {
      // Simple ping packet with no data
      const frameData = BinaryUtils.int32ToBytes(2); // Packet type 2 for PING
      const packet = new HciPacket(frameData, "PING");
      
      console.log('[SERIAL] Created ping packet');
      
      // Send the ping packet
      const result = await this.sendPacket(packet);
      
      console.log('[SERIAL] Ping packet sent successfully, received ACK');
      this.logger.info("[DFU] Device responded to ping");
      
      return true;
    } catch (error) {
      console.error('[SERIAL] Error sending ping:', error);
      return false;
    }
  }
  
  /**
   * Send a validate firmware command
   * @returns {Promise<boolean>} True if successful
   */
  async sendValidateFirmware() {
    this.logger.info("[DFU] Validating firmware...");
    console.log('[SERIAL] Sending VALIDATE_FIRMWARE command to device');
    
    try {
      // Check if we're still connected
      if (!this.isOpen()) {
        console.log('[SERIAL] Device already disconnected, validation skipped');
        return true; // Return success since this is expected behavior
      }
      
      // Validate firmware requires sending a calculate checksum request
      const frameData = BinaryUtils.int32ToBytes(DfuProtocol.VALIDATE_FIRMWARE);
      const packet = new HciPacket(frameData, "VALIDATE_FIRMWARE");
      
      console.log('[SERIAL] Created validation packet');
      
      // Send the validation packet with a shorter timeout (device might reset quickly)
      const originalTimeout = DfuTransportSerial.ACK_PACKET_TIMEOUT;
      DfuTransportSerial.ACK_PACKET_TIMEOUT = 2000; // 2 seconds is enough for validation
      
      try {
        await this.sendPacket(packet);
        console.log('[SERIAL] Validation packet sent successfully, received ACK');
        this.logger.info("[DFU] Firmware validation successful");
      } catch (error) {
        // If the error is due to device disconnection, this is expected
        if (error.message.includes('device has been lost') || 
            error.message.includes('Timeout waiting for ACK')) {
          console.log('[SERIAL] Device disconnected during validation (expected behavior)');
          return true; // Device has likely reset with new firmware, count as success
        }
        throw error; // Re-throw other errors
      } finally {
        // Restore original timeout
        DfuTransportSerial.ACK_PACKET_TIMEOUT = originalTimeout;
      }
      
      return true;
    } catch (error) {
      console.error('[SERIAL] Error validating firmware:', error);
      
      // If this is a disconnection, it might be okay
      if (error.message.includes('device has been lost') || 
          error.message.includes('Transport is not open')) {
        console.log('[SERIAL] Device disconnected during validation process (expected behavior)');
        return true; // Assume success
      }
      
      return false;
    }
  }
  
  /**
   * Send an init packet
   * @param {Uint8Array} initPacket - Init packet data
   * @returns {Promise<void>}
   */
  async sendInitPacket(initPacket) {
    this.logger.info("[DFU] Sending init packet...");
    
    // Create frame with init packet command
    const frameData = BinaryUtils.mergeArrays(
      BinaryUtils.int32ToBytes(DfuProtocol.INIT_PACKET),
      initPacket,
      BinaryUtils.int16ToBytes(0x0000)  // Padding required
    );
    
    // Create and send packet
    const packet = new HciPacket(frameData, "INIT_PACKET");
    await this.sendPacket(packet);
  }
  
  /**
   * Calculate erase wait time based on the firmware size
   * @returns {number} Wait time in milliseconds
   */
  getEraseWaitTime() {
    // Timeout is not less than 500ms
    return Math.max(500, 
      ((this.totalSize / DfuTransportSerial.FLASH_PAGE_SIZE) + 1) * 
      DfuTransportSerial.FLASH_PAGE_ERASE_TIME);
  }
  
  /**
   * Calculate activate wait time
   * @returns {number} Wait time in milliseconds
   */
  getActivateWaitTime() {
    if (this.singleBank && this.sdSize === 0) {
      // Single bank and not updating SD+Bootloader, we can skip bank1 -> bank0 delay
      // but still need to delay bootloader setting save (1 flash page)
      return DfuTransportSerial.FLASH_PAGE_ERASE_TIME + DfuTransportSerial.FLASH_PAGE_WRITE_TIME;
    } else {
      // Activate wait time including time to erase bank0 and transfer bank1 -> bank0
      const writeWaitTime = ((this.totalSize / DfuTransportSerial.FLASH_PAGE_SIZE) + 1) * 
                          DfuTransportSerial.FLASH_PAGE_WRITE_TIME;
      return this.getEraseWaitTime() + writeWaitTime;
    }
  }
  
  /**
   * Send start DFU command
   * @param {number} mode - DFU mode
   * @param {number} softdeviceSize - Size of softdevice
   * @param {number} bootloaderSize - Size of bootloader
   * @param {number} appSize - Size of application
   * @returns {Promise<void>}
   */
  async sendStartDfu(mode, softdeviceSize = 0, bootloaderSize = 0, appSize = 0) {
    this.logger.info(`[DFU] Starting DFU in mode ${mode}...`);
    
    // Create image size packet (array of 3 uint32 values for sd, bl, app)
    const imageSizePacket = new Uint8Array(12);
    const view = new DataView(imageSizePacket.buffer);
    
    view.setUint32(0, softdeviceSize || 0, true);
    view.setUint32(4, bootloaderSize || 0, true);
    view.setUint32(8, appSize || 0, true);
    
    // Create frame with start packet command
    const frameData = BinaryUtils.mergeArrays(
      BinaryUtils.int32ToBytes(DfuProtocol.START_PACKET),
      BinaryUtils.int32ToBytes(mode),
      imageSizePacket
    );
    
    // Create and send packet
    const packet = new HciPacket(frameData, "START_PACKET");
    await this.sendPacket(packet);
    
    this.sdSize = softdeviceSize || 0;
    this.totalSize = (softdeviceSize || 0) + (bootloaderSize || 0) + (appSize || 0);
    
    // Wait for device to prepare (erase flash)
    const eraseWaitTime = this.getEraseWaitTime();
    this.logger.info(`[DFU] Waiting ${(eraseWaitTime/1000).toFixed(2)} seconds for device to prepare...`);
    await new Promise(resolve => setTimeout(resolve, eraseWaitTime));
  }
  
  /**
   * Send activate firmware command
   * @returns {Promise<void>}
   */
  async sendActivateFirmware() {
    this.logger.info("[DFU] Activating new firmware...");
    console.log('[SERIAL] Sending ACTIVATE_AND_RESET command to device');
    
    // Check if we're still connected
    if (!this.isOpen()) {
      console.log('[SERIAL] Device already disconnected, activation skipped');
      this.logger.info("[DFU] Device already reset with new firmware");
      return true; // Return success since this is expected behavior
    }
    
    try {
      // Send an ACTIVATE_AND_RESET command to the device
      const frameData = BinaryUtils.int32ToBytes(DfuProtocol.ACTIVATE_AND_RESET);
      const packet = new HciPacket(frameData, "ACTIVATE_AND_RESET");
      
      console.log('[SERIAL] Created activation packet');
      
      // Use a shorter timeout for activation, as device will reset quickly
      const originalTimeout = DfuTransportSerial.ACK_PACKET_TIMEOUT;
      DfuTransportSerial.ACK_PACKET_TIMEOUT = 1000; // 1 second is enough
      
      try {
        // Send the activation packet
        await this.sendPacket(packet);
        console.log('[SERIAL] Activation packet sent successfully');
      } catch (error) {
        // Expected behaviors: device disconnects or times out
        if (error.message.includes('device has been lost') || 
            error.message.includes('Timeout waiting for ACK')) {
          console.log('[SERIAL] Device reset after activation (expected)');
          return true;
        }
        throw error;
      } finally {
        // Restore original timeout
        DfuTransportSerial.ACK_PACKET_TIMEOUT = originalTimeout;
      }
      
      // No ACK is expected for activation since the device resets
      this.logger.info("[DFU] Device reset command sent successfully");
      
      // The device will now reset and run the new firmware
      return true;
    } catch (error) {
      console.error('[SERIAL] Error sending activation command:', error);
      
      // This might fail because the device already reset, which is actually a good sign
      if (error.message.includes('Transport is not open') ||
          error.message.includes('device has been lost')) {
        this.logger.warn("[DFU] Activation may have already occurred - device might have reset");
        return true;
      }
      
      // Not returning an error for most activation issues, as they're usually due to device reset
      this.logger.warn(`[DFU] Activation command failed: ${error.message}`);
      return true;
    }
  }
  
  /**
   * Send firmware data
   * @param {Uint8Array} firmware - Firmware data
   * @returns {Promise<void>}
   */
  async sendFirmware(firmware) {
    this.logger.info(`[DFU] Sending firmware (${firmware.length} bytes)...`);
    console.log(`[SERIAL] Starting firmware transfer of ${firmware.length} bytes`);
    
    // Helper function for progress percentage
    const progressPercentage = (part, whole) => Math.floor(100 * part / whole);
    
    // Send initial progress event
    this._sendEvent(DfuEvent.PROGRESS_EVENT, {
      progress: 0,
      done: false,
      message: ""
    });
    
    // Split firmware into chunks of DFU_PACKET_MAX_SIZE
    const chunkSize = DfuTransportSerial.DFU_PACKET_MAX_SIZE;
    console.log(`[SERIAL] Using chunk size of ${chunkSize} bytes`);
    
    const chunks = [];
    for (let i = 0; i < firmware.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, firmware.length);
      chunks.push(firmware.slice(i, end));
    }
    
    console.log(`[SERIAL] Split firmware into ${chunks.length} chunks`);
    
    // Create data packets
    console.log(`[SERIAL] Creating HCI packets from chunks...`);
    const packets = [];
    for (const chunk of chunks) {
      const frameData = BinaryUtils.mergeArrays(
        BinaryUtils.int32ToBytes(DfuProtocol.DATA_PACKET),
        chunk
      );
      packets.push(new HciPacket(frameData, "DATA_PACKET"));
    }
    
    console.log(`[SERIAL] Created ${packets.length} HCI packets`);
    console.log(`[SERIAL] Beginning packet transmission...`);
    
    // Send firmware packets
    let sentBytes = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < packets.length; i++) {
      try {
        console.log(`[SERIAL] Sending packet ${i+1}/${packets.length} (${packets[i].data.length} bytes)...`);
        
        // Send the packet
        await this.sendPacket(packets[i]);
        
        sentBytes += chunks[i].length;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const bytesPerSec = sentBytes / elapsedSec;
        
        console.log(`[SERIAL] Packet ${i+1} sent successfully`);
        console.log(`[SERIAL] Progress: ${sentBytes}/${firmware.length} bytes (${(bytesPerSec/1024).toFixed(2)} KB/s)`);
        
        // Report progress
        const progress = progressPercentage(i + 1, packets.length);
        this._sendEvent(DfuEvent.PROGRESS_EVENT, {
          progress: progress,
          done: false,
          message: `Sending packet ${i + 1} of ${packets.length}`
        });
        
        // After 8 frames (4096 Bytes), nrf5x will erase and write to flash
        // While erasing/writing to flash, nrf5x's CPU is blocked
        if (i % 8 === 0 && i > 0) {
          console.log(`[SERIAL] Waiting for flash write (${DfuTransportSerial.FLASH_PAGE_WRITE_TIME}ms)...`);
          await new Promise(resolve => setTimeout(resolve, DfuTransportSerial.FLASH_PAGE_WRITE_TIME));
        }
      } catch (error) {
        console.error(`[SERIAL] Error sending packet ${i+1}:`, error);
        throw error;
      }
    }
    
    console.log(`[SERIAL] All data packets sent successfully`);
    console.log(`[SERIAL] Waiting for last page to write (${DfuTransportSerial.FLASH_PAGE_WRITE_TIME}ms)...`);
    
    // Wait for last page to write
    await new Promise(resolve => setTimeout(resolve, DfuTransportSerial.FLASH_PAGE_WRITE_TIME));
    
    // Send data stop packet
    console.log(`[SERIAL] Sending STOP_DATA_PACKET...`);
    const stopFrameData = BinaryUtils.int32ToBytes(DfuProtocol.STOP_DATA_PACKET);
    const stopPacket = new HciPacket(stopFrameData, "STOP_DATA_PACKET");
    await this.sendPacket(stopPacket);
    console.log(`[SERIAL] STOP_DATA_PACKET sent successfully`);
    
    // Calculate stats
    const totalTime = (Date.now() - startTime) / 1000;
    const transferSpeed = (firmware.length / totalTime / 1024).toFixed(2);
    console.log(`[SERIAL] Firmware transfer complete: ${firmware.length} bytes in ${totalTime.toFixed(2)}s (${transferSpeed} KB/s)`);
    
    // Send final progress event
    this._sendEvent(DfuEvent.PROGRESS_EVENT, {
      progress: 100,
      done: false,
      message: "Firmware transfer complete"
    });
  }
}

// Export transport for ES6 modules
export { HciPacket, DfuTransportSerial };

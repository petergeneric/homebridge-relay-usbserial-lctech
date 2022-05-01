import {Logger} from 'homebridge';
import {SubEvent} from 'sub-events';
import SerialPort from 'serialport';

export class RelayState {
	constructor(public readonly relayNum: number,
		public readonly state: boolean) {
	}
}

export class RelayClient {
	public readonly onNewReading: SubEvent<RelayState> = new SubEvent();

	private poller: NodeJS.Timer | null = null;
	private port: SerialPort;

	constructor(
		public readonly log: Logger | null,
		public readonly deviceName: string,
		public readonly relayCount: number) {

		this.port = new SerialPort(deviceName, {baudRate: 9600});
		this.port.on('data', this.dataReceived.bind(this));
	}


	start() {
		if (this.poller !== null) {
			return;
		} // Cannot start twice

		// Open the port; once open, start polling
		this.port.open(this.onOpened.bind(this));
	}

	stop() {
		if (this.poller !== null) {
			clearInterval(this.poller);

			this.poller = null;
		}
	}

	poll() {
		this.port.write([0xFF]);
	}

	onOpened() {
		// Get initial state
		this.poll();

		// Periodically poll the relay state to catch changes made without our instruction
		this.poller = setInterval(this.poll.bind(this), 300000);
	}

	private dataReceived(data: Buffer) {

		// parse data
		const states = RelayClient.parseState(data);

		// Emit all sensor readings
		for (const reading of states) {
			this.onNewReading.emit(reading);
		}
	}

	private static parseState(data: Buffer): RelayState[] {
		const raw = data.toString();

		const lines = raw.split('\n');

		const ret: RelayState[] = [];
		for (const line of lines) {
			if (line.indexOf(':') !== -1) {

				const parts = line.split(':');
				const relayNum = parseInt(parts[0].substring(2));
				const state = (parts[1].trim() === 'ON');

				ret.push(new RelayState(relayNum, state));
			}
		}

		return ret;
	}

	set(relayNumber: number, on: boolean) {
		if (relayNumber <= 0 || relayNumber > this.relayCount) {
			throw new Error('Unsupported relay number: ' + relayNumber + ' expected 1 to ' + this.relayCount);
		}

		const relayOctet = relayNumber;
		const onFlag = on ? 0x01 : 0x00; // 0x01 for open, 0x00 for closed
		const lastOctet = 0xA0 + relayNumber + onFlag; // A2 for Relay=1 Open, A1 for Relay=1 Close. A3 for Relay=2 Open, A2 for Relay=2 Close, etc.

		this.port.write([0xA0, relayOctet, onFlag, lastOctet]);
	}
}



import {Service, PlatformAccessory} from 'homebridge';

import {RelayPlatform} from './platform';
import {RelayClient, RelayState} from './relay';

export class RelayPIRAccessory {
	private service: Service;
	private readonly name: string;
	private currentState: boolean|null = null;

	constructor(
		private readonly relays: RelayClient,
		private readonly relayNumber: number,
		private readonly platform: RelayPlatform,
		private readonly accessory: PlatformAccessory,
	) {

		// set accessory information
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'lctech')
			.setCharacteristic(this.platform.Characteristic.Model, '1.0');

		// get the MotionSensor service if it exists, otherwise create a new MotionSensor service
		// you can create multiple services for each accessory
		// see https://developers.homebridge.io/#/service/MotionSensor
		this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);

		this.service.getCharacteristic(this.platform.Characteristic.On).on('set', this.setPowerState.bind(this));

		this.name = accessory.context.device;

		// set the service name, this is what is displayed as the default name on the Home app
		// in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
		this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);

		// Subscribe to new readings for this sensor
		this.relays.onNewReading.subscribe(reading => {
			if (reading.relayNum === this.relayNumber) {
				this.onNewReading(reading.state);
			}
		});
	}

	private setPowerState(on, callback) {
		try {
			this.relays.set(this.relayNumber, on);

			// Change the on state
			this.onNewReading(on);

			// After a short time, request a state update
			setTimeout(() => {
				this.relays.poll()
			}, 500);

			callback();
		} catch (e) {
			callback(new Error('Encountered error: ' + e));
		}
	}

	private onNewReading(relayState: boolean) {

		// push the new value out to HomeKit
		this.service.updateCharacteristic(this.platform.Characteristic.On, relayState);

		if (this.currentState !== relayState) {
			this.currentState = relayState;

			if (relayState) {
				this.platform.log.debug('Relay', this.relayNumber, 'on');
			} else {
				this.platform.log.debug('Relay', this.relayNumber, 'off');
			}
		}
	}
}

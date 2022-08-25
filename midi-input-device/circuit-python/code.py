import time
import board
import digitalio
import analogio
import usb_midi
import adafruit_midi

from adafruit_midi.control_change import ControlChange

import config

help()
print('board "{}": {}'.format(board.board_id, dir(board)))
print("# of USB MIDI ports: {}".format(len(usb_midi.ports)))

print()
print("Current configuration:")
print("MIDI output port:", config.midi_port)
print("MIDI channel:", config.midi_channel)
print("MIDI control:", config.midi_control)
print("Analog input pin:", config.analog_pin)
print("Digital LED output pin:", config.led_pin if hasattr(config, "led_pin") else None)
print("Minimum timespan (seconds) between sends:", config.min_send_interval)
print("Resend interval (seconds):", config.resend_interval)
print("Smoothing factor:", config.smoothing)

if hasattr(config, "led_pin"):
    led = digitalio.DigitalInOut(config.led_pin)
    led.direction = digitalio.Direction.OUTPUT
else:
    led = None

analog_in = analogio.AnalogIn(config.analog_pin)

midi = adafruit_midi.MIDI(
    midi_out=usb_midi.ports[config.midi_port], out_channel=config.midi_channel
)
control = config.midi_control

resend_interval = config.resend_interval
min_send_interval = config.min_send_interval
smoothing = config.smoothing

half_step = (1 / 128) / 2
v = 0
last_sent_v = -1
last_send_time = 0
led_duration = min_send_interval / 10

print()

while True:
    now = time.monotonic()
    a = analog_in.value
    r = a / 65535
    v = v * (1.0 - smoothing) + r * smoothing

    can_send = now - last_send_time > min_send_interval
    has_fallen = (v < half_step < last_sent_v) or (last_sent_v - v >= half_step)
    has_risen = (v - last_sent_v >= half_step) or (last_sent_v < 1 - half_step < v)
    has_changed = has_risen or has_fallen
    should_resend = now - last_send_time > resend_interval

    if should_resend or (can_send and has_changed):
        cc = min(max(0, round(v * 128 - 0.5)), 127)
        print("{:3d} {:0.5f} {:5d}".format(cc, r, a))
        if led is not None:
            led.value = True
        midi.send(ControlChange(control, cc))
        last_sent_v = v
        last_send_time = now

    if led is not None and now - last_send_time > led_duration:
        led.value = False

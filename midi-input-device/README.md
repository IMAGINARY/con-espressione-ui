# MIDI slider

The exhibit allows to control the impact of the machine learning via MIDI control change messages. Basically, any MIDI
device that has sliders or knobs can be used, but often these devices come with many more than just one control.

Fortunately, it is not hard to create your own MIDI device using a microcontroller and
basically any [linear potentiometer](https://duckduckgo.com/?q=linear+potentiometer+(slider+OR+knob)&t=h_&iax=images&ia=images).
Some soldering may be required as well.

The folder contains implementations for different microcontroller platforms in its sub-folders:
- [Arduino code](./teensy) for the [Teensy LC](https://www.pjrc.com/teensy/teensyLC.html) microcontroller
- [Python code](./circuit-python) for any board compatible with [CircuitPython](https://circuitpython.org)
import board

# Analog pin to be used as input.
# Connect to the voltage divider pin of your potentiometer.
analog_pin = board.A2

# Digital pin to be used as output to signal that a MIDI message has been sent.
# Leave undefined to disable.
led_pin = board.LED

# MIDI port to be used as the output.
midi_port = 1

# MIDI channel the messages are sent to.
midi_channel = 1

# MIDI control to change.
midi_control = 20

# Minimum duration (seconds) between subsequent MIDI messages. Helps to avoid
# flooding the MIDI port with messages when the input is noisy.
min_send_interval = 1 / 60

# Re-send the current control value periodically after the given number of
# seconds. Useful if the MIDI client has been disconnected, but needs the
# current value of the control to function properly.
# Set to float("inf") to disable.
resend_interval = 1

# Smoothing factor of analog input. Must be in (0,1].
# The analog input will be read in a loop. This factor interpolates between the
# values accumulated so far and the newly read value. A factor of 1 will ignore
# the previous values, but this may be very noisy.
smoothing = 0.05

# Spread the values of the analog input over a smaller or larger interval.
# Useful if the input device does not cover the full range of possible values.
# Formula:
#   out = (in - spread_center) * spread_factor + spread_center
spread_factor = 1
spread_center = 0.5

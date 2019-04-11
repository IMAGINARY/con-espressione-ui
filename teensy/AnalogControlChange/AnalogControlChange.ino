#include <Bounce.h>

// select analog input to messure
#define A_IN A9 

// the MIDI channel number to send messages
const int channel = 1;

// the MIDI continuous controller for each analog input
// see https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2
const int controller = 20; // 20 = undefined

void setup() {
}

// store previously sent values, to detect changes
int previous = -1;
long sum_A_IN = 0;
unsigned int num_A_IN = 0;

elapsedMillis msec = 0;
elapsedMillis msecResend = 0;

void loop() {
  sum_A_IN += analogRead(A_IN);
  ++num_A_IN;

  // only check the analog inputs 50 times per second,
  // to prevent a flood of MIDI messages
  if (msec >= 20) {
    msec = 0;
    int n = ( sum_A_IN / num_A_IN ) / 8;
    sum_A_IN = 0;
    num_A_IN = 0;

    // only transmit MIDI messages if analog input changed enough
    if (msecResend >= 1000 || n != previous) {
      previous = n;
      msecResend = 0;
      usbMIDI.sendControlChange(controller, n, channel);
    }
  }

  // MIDI Controllers should discard incoming MIDI messages.
  // http://forum.pjrc.com/threads/24179-Teensy-3-Ableton-Analog-CC-causes-midi-crash
  while (usbMIDI.read()) {
    // ignore incoming messages
  }
}

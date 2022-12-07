# Con Espressione! (frontend components)

This repository contains a frontend for [*Con Espressione!*](https://github.com/IMAGINARY/con-espressione),
a software for mimicking real piano performances based on a data-driven performance model.

Global volume and tempo are controlled via hand movement over a [LEAP motion sensor](https://www.leapmotion.com).
The impact of the machine learning algorithm is controlled via a dedicated [MIDI device](midi-input-device).

![Screenshot of the main Con Espressione! frontend](https://user-images.githubusercontent.com/2445084/58544246-2a6ee680-8201-11e9-988b-78bf8b85dc3c.jpg)

For selecting a composition to control the performance of, a dedicated [applauncher2](https://github.com/IMAGINARY/applauncher2) menu is provided that can be shown on a separate (touch) screen.
![Screenshot of the Con Espressione! menu](https://user-images.githubusercontent.com/2445084/58544581-d9abbd80-8201-11e9-8a5b-a5f7418d761a.jpg)

The main and menu frontends communicate with the [python backend via MIDI messages](https://github.com/IMAGINARY/con-espressione#midi-interface).
This provides a unified interface for song selection, playback control, parameter adjustments and note playback.

## Background

A piece of music can be described with mathematical accuracy on a score, with
symbols perfectly defined in a well-founded theory. However, music is above all
an art, and as such it conveys emotions, feelings, and human sensations. How is
it possible to express these feelings, given such a strict notation? How can a
performer make a piece come alive? What lies beneath the score sheet and the
execution of a piece?

A human performer does not play all the notes of a chord at the same time, nor
do they keep a strict tempo; some notes start a few milliseconds earlier, or are
released a few milliseconds later, some are played louder than others, some
appear quicker, etc. All these nuances allow a performing musician to express
themselves and imprint some feelings and emotions onto the performance. A
musician is not a machine that perfectly reproduces the score, and these
“imperfections” or deviations are what make the music alive, something that
humans do naturally but a machine could never do... or could it?

This exhibit allows you to explore the difference between a mechanical
reproduction of a piece and a more “human” interpretation produced by an
Artificial Intelligence that was trained to behave as a musician. The visitor
takes the role of a music conductor, controlling overall tempo and loudness of a
piano performance. Via a camera sensor, the hand of the visitor is tracked in
space. The updown position determines the loudness (volume) of the music, and
the left-right position determines the tempo (the speed) of the music.
Initially, this is achieved by directly adapting the loudness and tempo of the
overall piece according to the position of the hand, but even if the machine
obeys you to set these values, the music feels automatic and soul-less. This is
because with your hand movements, you can only control overall tempo and
loudness, but not the fine details of a performance (such as how to play the
individual notes, or how to stress the melody line).

Then, a slider allows you to activate the Artificial Intelligence. The higher
the value, the more freedom has the machine to choose small deviations from the
prescribed parameters. The machine adjusts the tempo and loudness to be slightly
different from what you conduct, to make the music more lively and less
“mechanical”. It also introduces changes in the dynamic spread, micro-timing,
and articulation.

- The loudness is the volume, i.e. the amount of amplification of the sound of
  each note. Raising the loudness is the most obvious way to stress a note.
- Dynamic spread relates to loudness differences between simultaneously played
  notes (e.g., in a chord). This is important to make the melody line come out
  clearly and to change the overall “sound” of a chord.
- Musical tempo is defined as the rate at which musical events or beats are
  played. Music performers continually change the tempo, speeding up or slowing
  down, to express the “ebb and flow” of the music. This is what makes music
  sound natural to us (and we may not even be conscious of all these tempo
  fluctuations).
- Microtiming refers to the moment that a note plays with respect to its
  supposed onset. For example, if a chord consists of several notes that are
  supposed to be played together, one can advance one note over another by a few
  milliseconds, so that not all of them are perfectly synchronized. This is
  inevitable in real-life performance, and it makes the piece more warm, human
  and expressive.
- Articulation here refers to the duration of a note with respect to its
  supposed duration according to the score. Notes can be played a bit longer or
  shorter than the composer described in the score, tying them together or
  separating them, which helps to stress or diffuse some notes amongst the
  others. In musical language, this is described with terms as legato and
  staccato.

Each performer has their own experience, understanding of a piece, and
expressive intentions, and communicating these in a performance requires control
over musical parameters at many levels – from precise note-level details like
articulation or micro-timing to high-level, long-term tempo and the shaping of
its dynamics. The computer program behind this exhibit was trained with hundreds
of real-life performances of music pieces to analyze and learn how these
parameters are used and controlled in real-life interpretations by human
pianists. Experimental results show that computers are already very good at
learning the low-level, detailed decisions, but still have problems
understanding the larger-scale form and dramatic structure of music, and the
high-level shaping this requires. Thus, the exhibit explores and demonstrates a
compromise: you control overall loudness and tempo with your hand, at a high
level, based on your understanding of the music, and the computer adds its own
local details and deviations. In this way, the resulting performance is the
product of a true cooperation between a human (you) and a computer (AI).

## Installation instructions

The software has been tested to work on masOS and Linux. However, we only provide instructions for our main target platform,
which is Ubuntu Linux 18.04.

### Backend

#### Install Miniconda 3
```
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
chmod +x ./Miniconda3-latest-Linux-x86_64.sh
sudo ./Miniconda3-latest-Linux-x86_64.sh -b -p /opt/miniconda3
sudo chmod 777 -R /opt/miniconda3/

sudo ln -s /opt/miniconda3/etc/profile.d/conda.sh /etc/profile.d/conda.sh
echo "conda activate" >> ~/.bashrc
```

#### Install the backend
```
sudo apt install pkg-config libjack0 libjack-dev libasound2-dev
git clone https://github.com/IMAGINARY/con-espressione.git
/opt/miniconda3/bin/conda env create -f environment.yml
```

### Frontend
```
git clone https://github.com/IMAGINARY/con-espressione-ui.git
cd con-espressione-ui
./install.sh # Init and update the applauncher2 submodule and copy the menu configuration into place
```

#### Install Leap Motion packages (leapd)
```
sudo apt install curl
curl -L https://warehouse.leapmotion.com/apps/4186/download | tar xvz Leap_Motion_Installer_Packages_release_public_linux/Leap-2.3.1+31549-x64.deb
sudo dpkg -i Leap_Motion_Installer_Packages_release_public_linux/Leap-2.3.1+31549-x64.deb
rm -r Leap_Motion_Installer_Packages_release_public_linux/
```

Create the systemd unit file `/lib/systemd/system/leapd.service` containing
```
# Based on https://forums.leapmotion.com/t/tip-ubuntu-systemd-and-leapd/2118
[Unit]
Description=LeapMotion Daemon
After=syslog.target

[Service]
Type=simple
ExecStart=/usr/sbin/leapd
KillSignal=SIGKILL
Restart=always
RestartSec=10ms

[Install]
WantedBy=multi-user.target
```
for automatically starting up the Leap Motion daemon.

Make the systemd daemon aware of the new service, enable and launch it:
```
sudo systemctl daemon-reload
sudo systemctl enable leapd.service
sudo systemctl start leapd.service
```

### Configuration and Running

#### Backend

Inside the backend directory, execute
```
conda activate con_espressione
python con-epsressione.py
```
and keep it running (in the background).

#### Frontend

Configure a web server to statically serve the files in this repository.

Python:
```shell
python3 -m http.server -d /path/to/frontend [port]
```

Node.js:
```shell
npx reload -d /path/to/frontend -p 8081
```

##### Main frontend

Point a Chrome or Chromium based web browser to `http(s)://server:port/src/index.html` for loading the main frontend.

The UI comes with a couple of configuration options that can be provided via URL parameters (`index.html?parameter1=value1&parameter2=value2`):
* `darkMode`: Whether the UI should use a dark theme. (default: `false`)
* `backendMidiInput`: MIDI input device name of the backend. (default: `con-espressione`)
* `backendMidiOutput`: MIDI output device name of the backend.  (default: `con-espressione`)
* `mlImpactMidiInput`: Name of the MIDI device to control the machine learning parameter. (default: `SOLO Control`)
* `composition`: ID of the composition to select for autoplay. (default: `0`)
* `enableSynth`: Enable the built-in piano synthesizer. (default: `true`)
* `showDebugTools`: Show additional diagnostics and controls for tweaking and debugging. (default: `false`)
* `autoPlay`: Automatically start playback of the selected composition. (default: `false`)
* `reloadOnError`: Reload the UI if an unhandled error occurs. This can be handy in exhibition setups where the software runs unattended. The UI itself is unlikely to crash. However, the [`leap.js` library](https://github.com/leapmotion/leapjs) for interacting with the LEAP motion device sometimes crashes for no good reason. This option should be disabled during development and for debug purposes. (default: `true`)

##### Menu for selecting the composition

Point a Chrome or Chromium based web browser to `http(s)://server:port/menu/applauncher2/index.html?cfg=con-espressione`.

### Piano Synthesizer

The frontend has a built-in synthesizer based on [MIDI.js](https://github.com/mudcube/MIDI.js).
It is good enough for testing, but the software only unlocks its full potential when
combined with a dedicated piano synthesizer.

The following two software synthesizers have been confirmed to work quite well:
- Free software: [Fluidsynth](https://www.fluidsynth.org) combined with the [Salamander soundfont](https://rytmenpinne.wordpress.com/sounds-and-such/salamander-grandpiano/).
- Commercial software: [Modartt Pianoteq](https://www.modartt.com/pianoteq) combined with the [Steinway Model D grand piano](https://www.modartt.com/modeld) virtual instrument.

It should also be possible to connect external hardware synthesizers even through this has not been tested.

When using an external synthesizer, the built-in synthesizer must be disabled by passing the URL parameter `enableSynth=false`.

#### Fluidsynth

Follow the [Fluidsynth installation instructions](https://github.com/FluidSynth/fluidsynth/wiki/Download) for your platform.

Download an `.sf2` or `.sf3` piano soundfont of your choice. The [Salamander soundfont](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) is recommended. 

After starting the [*Con Espressione!* backend](#Backend-1), launch Fluidsynth in server mode (`-s`), without opening an interactive shell (`-i`), with unmodified audio gain (`-g 1`), automatically connect to all available MIDI outputs (`-o midi.autoconnect=True`) and use the given soundfont:
```shell
fluidsynth -s -i -g 1 -o midi.autoconnect=True /path/to/the/soundfont
```

Depending on your platform, it may be necessary to add the `-m` to switch to another MIDI driver. Use one of the options provided by
```shell
fluidsynth -m help
```

#### Pianoteq

Obtain a [Pianoteq license](https://www.modartt.com/buy) (the *Stage* version should suffice),
selecting an instrument pack of your choice during checkout. The [Steinway Model D grand piano](https://www.modartt.com/modeld) is recommended.

Then, download and install the software for your platform.

With the [*Con Espressione!* backend](#Backend-1) already running, connect the Pianoteq synthesizer to the MIDI output named `con-espressione`.

#### Synthesizer post-installation instructions for Linux
After installing and configuring a synthesizer on Linux,
you should equip your user with realtime permissions to avoid crackling audio.

Add a `realtime` group and your user to this group:
```
sudo addgroup realtime
export ID=$(id -un)
sudo usermod -a -G realtime,audio $ID
```

Put into /etc/security/limits.d/99-realtime.conf:
```
@realtime - rtprio 99
@realtime - nice -10
@realtime - memlock unlimited
```

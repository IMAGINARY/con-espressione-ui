# Frontend for Con Espressione!

This repository contains a frontend for [*Con Espressione!*](https://github.com/IMAGINARY/con-espressione),
a software for mimicking real piano performances based on a data-driven performance model.

Global volume and tempo are controlled via hand movement over a [LEAP motion sensor](https://www.leapmotion.com).
The impact of the machine learning algorithm is controlled via a dedicated [MIDI device](midi-input-device).

![Screenshot of the main Con Espressione! frontend](https://user-images.githubusercontent.com/2445084/58544246-2a6ee680-8201-11e9-988b-78bf8b85dc3c.jpg)

For selecting a composition to control the performance of, a dedicated [applauncher2](https://github.com/IMAGINARY/applauncher2) menu is provided that can be shown on a separate (touch) screen.
![Screenshot of the Con Espressione! menu](https://user-images.githubusercontent.com/2445084/58544581-d9abbd80-8201-11e9-8a5b-a5f7418d761a.jpg)

The main and menu frontends communicate with the [python backend via MIDI messages](https://github.com/IMAGINARY/con-espressione#midi-interface).
This provides a unified interface for song selection, playback control, parameter adjustments and note playback.

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

Based on https://forums.leapmotion.com/t/tip-ubuntu-systemd-and-leapd/2118, put
```
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
into `/lib/systemd/system/leapd.service` and execute
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

We recommend using the cross-platform [Pianoteq synthesizer](https://www.pianoteq.com/).

#### Pianoteq post-installation instructions for Linux
After installing and registering the Pianoteq synthesizer on Linux,
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

#### Pianoteq configuration

After starting the [*Con Espressione!* backend](#Backend-1),
connect to the `con-espressione` virtual MIDI device.

The recommended instrument is [Steinway Model D grand piano](https://www.pianoteq.com/modeld).

Now, the UI should be launched using the `enableSynth=false` URL parameter to disable the internal synthesizer.

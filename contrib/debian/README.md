
Debian
====================
This directory contains files used to package ausd/aus-qt
for Debian-based Linux systems. If you compile ausd/aus-qt yourself, there are some useful files here.

## bitcoincash: URI support ##


aus-qt.desktop  (Gnome / Open Desktop)
To install:

	sudo desktop-file-install aus-qt.desktop
	sudo update-desktop-database

If you build yourself, you will either need to modify the paths in
the .desktop file or copy or symlink your aus-qt binary to `/usr/bin`
and the `../../share/pixmaps/bitcoin-abc128.png` to `/usr/share/pixmaps`

aus-qt.protocol (KDE)


Sample init scripts and service configuration for ausd
==========================================================

Sample scripts and configuration files for systemd and OpenRC
can be found in the contrib/init folder.

    contrib/init/ausd.service:    systemd service unit configuration
    contrib/init/ausd.openrc:     OpenRC compatible SysV style init script
    contrib/init/ausd.openrcconf: OpenRC conf.d file
    contrib/init/ausd.init:       CentOS compatible SysV style init script

Service User
---------------------------------

Both Linux startup configurations assume the existence of a "bitcoin" user
and group.  They must be created before attempting to use these scripts.
The macOS configuration assumes ausd will be set up for the current user.

Configuration
---------------------------------

Running ausd as a daemon does not require any manual configuration. You may
set the `rpcauth` setting in the `auscash.conf` configuration file to override
the default behaviour of using a special cookie for authentication.

This password does not have to be remembered or typed as it is mostly used
as a fixed token that ausd and client programs read from the configuration
file, however it is recommended that a strong and secure password be used
as this password is security critical to securing the wallet should the
wallet be enabled.

If ausd is run with the "-server" flag (set by default), and no rpcpassword is set,
it will use a special cookie file for authentication. The cookie is generated with random
content when the daemon starts, and deleted when it exits. Read access to this file
controls who can access it through RPC.

By default the cookie is stored in the data directory, but it's location can be overridden
with the option '-rpccookiefile'.

This allows for running ausd without having to do any manual configuration.

`conf`, `pid`, and `wallet` accept relative paths which are interpreted as
relative to the data directory. `wallet` *only* supports relative paths.

For an example configuration file that describes the configuration settings,
see `contrib/debian/examples/auscash.conf`.

Paths
---------------------------------

### Linux

All three configurations assume several paths that might need to be adjusted.

Binary:              `/usr/bin/ausd`\
Configuration file:  `/etc/bitcoin/auscash.conf`\
Data directory:      `/var/lib/ausd`\
PID file:            `/var/run/ausd/ausd.pid` (OpenRC) or `/var/lib/ausd/ausd.pid` (systemd)\
Lock file:           `/var/lock/subsys/ausd` (CentOS)

The configuration file, PID directory (if applicable) and data directory
should all be owned by the bitcoin user and group.  It is advised for security
reasons to make the configuration file and data directory only readable by the
bitcoin user and group.  Access to aus-cli and other ausd rpc clients
can then be controlled by group membership.

### Mac OS X

Binary:              `/usr/local/bin/ausd`\
Configuration file:  `~/Library/Application Support/Bitcoin/auscash.conf`\
Data directory:      `~/Library/Application Support/Bitcoin`\
Lock file:           `~/Library/Application Support/Bitcoin/.lock`

Installing Service Configuration
-----------------------------------

### systemd

The systemd service file expects the ausd executable to be located in
~/bitcoin-abc/bin/ausd, so make sure to create the directory and move or
copy the file before running the following instructions.

Installing this .service file consists of copying it to the
~/.config/systemd/user directory, followed by the command `systemctl --user
daemon-reload` in order to update the running systemd configuration.

To start ausd, run `systemctl --user start ausd`, to tell systemd to
start ausd at bootup run
`loginctl enable-linger && systemctl --user enable ausd`, and to see the
current status run `systemctl --user status ausd`.

### OpenRC

Rename ausd.openrc to ausd and drop it in /etc/init.d.  Double
check ownership and permissions and make it executable.  Test it with
`/etc/init.d/ausd start` and configure it to run on startup with
`rc-update add ausd`

### CentOS

Copy ausd.init to /etc/init.d/ausd. Test by running `service ausd start`.

Using this script, you can adjust the path and flags to the ausd program by
setting the BITCOIND and FLAGS environment variables in the file
/etc/sysconfig/ausd. You can also use the DAEMONOPTS environment variable here.

### Mac OS X

Copy org.bitcoin.ausd.plist into ~/Library/LaunchAgents. Load the launch agent by
running `launchctl load ~/Library/LaunchAgents/org.bitcoin.ausd.plist`.

This Launch Agent will cause ausd to start whenever the user logs in.

NOTE: This approach is intended for those wanting to run ausd as the current user.
You will need to modify org.bitcoin.ausd.plist if you intend to use it as a
Launch Daemon with a dedicated bitcoin user.

Auto-respawn
-----------------------------------

Auto respawning is currently only configured for systemd.
Reasonable defaults have been chosen but YMMV.

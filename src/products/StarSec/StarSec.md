# StarSec
**Status:** Active
**Version:** 0.11.0
**License:** Proprietary

Real-time multiplayer cyber warfare played in 3D. Two teams work capital starships from a
3D bridge while each side runs 24 Docker containers of real tools. Attacks execute real
commands against real containers and defenses really drop traffic, so it is purple versus
purple: both sides attack and defend at the same time, with no phases and no turns. Built
for live broadcast at events, streaming to OBS over NDI.

- 3D bridge interior in Panda3D, with terminals emulated in world
- 24 containers per team, running nmap, metasploit, sqlmap, Snort, iptables and SIEM
- Four roles: operator, captain, audience fighter pilot, and cinematic camera control
- Audience plays dogfighting in the browser from a shared cockpit
- Scored per attack, defense, repair and kill, with a style multiplier for advanced play
- Used on conference floors, training ranges, CTF events and in classrooms

# DILI: HEX-FALL ⚡🧊🔥
> **A high-octane 3D Cyber Hexagon Survival Arena built with Three.js, Node.js, and Socket.IO.**

![DILI Hex Fall](public/assets/dlicom-logo-transparent.png)

## 🎮 Overview

**DILI: HEX-FALL** is a real-time 3D multiplayer arena combat game. Pilots control custom bumper crafts in shrinking hexagonal colosseums, battling against human players and tactical AI bots. Knock opponents off collapsing rings into the void while evading devastating kinetic hazards and leveraging speed boost vents!

---

## ✨ Features

### 🏟️ 3 Distinct Combat Arenas
- **⚡ Neon Colosseum**: High-tech cyber stadium featuring dual-blade rotating hydraulic laser sweepers and corner jump pads for evasive maneuvers.
- **🔥 Inferno Forge**: Cruciform fortress suspended over molten lava with a central quad-blade crusher hammer rotor and 4 erupting thermal geysers.
- **❄️ Cryo Glacier**: Frozen floating ice floe archipelago with low-friction drift physics, a massive **3D Tri-Blade Glacial Ice Sweeper Rotor** (delivering 20+ m/s kinetic knockback), and 4 **Glacial Boost Vents** for supersonic drift surges.

### 💥 Combat & Physics Mechanics
- **Elastic Bumper Physics**: Realistic craft collisions with mass transfer, momentum preservation, and squash-and-stretch mesh deformations.
- **3D DILI Pilot Character**: Cockpit-mounted pilot with dynamic head-tracking, animated expressions, and combat callouts (*"RAM DASH!"*, *"GLACIAL SMACK!"*, *"CIRCUITS JAMMED!"*).
- **Tactical Abilities**:
  - **Turbo Dash (Spacebar)**: High-velocity ramming dash with exhaust flame elongation and trail ribbons.
  - **EMP Shockwave (E Key)**: Radial energy blast that repels nearby opponents and cancels incoming ram attacks.
- **Dynamic Arena Collapse**: Ring-by-ring platform collapse with audio-visual countdown warnings.

### 🌐 Real-Time Multiplayer & Smart AI
- **Socket.IO Multiplayer**: Instant matchmaking in persistent public arenas with automatic arena rotation and private room code support.
- **Tactical AI Opponents**: Intelligent bots with ring-awareness, edge avoidance, power-up acquisition, and retreat behaviors.

### 📱 Cross-Platform Controls & Audio
- **Desktop**: Responsive Keyboard + Mouse controls with camera follow smoothing.
- **Mobile Support**: On-screen floating virtual joystick and responsive touch buttons for Dash and EMP.
- **Synthesized Audio**: Procedural Web Audio API sound effects and arcade background music with no external audio file dependencies.

---

## 🕹️ Controls

| Action | Desktop (Keyboard/Mouse) | Mobile (Touch) |
|---|---|---|
| **Steer / Move** | `W / A / S / D` or `Arrow Keys` | Virtual Joystick (Left) |
| **Turbo Dash** | `Spacebar` | **DASH** Button |
| **EMP Shockwave** | `E` Key | **EMP** Button |
| **Camera Rotate** | Mouse Drag / Arrow Keys | Touch Drag |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- `npm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nathbabu/dili-hex-fall.git
   cd dili-hex-fall
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local server**:
   ```bash
   npm start
   ```

4. **Play**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🛠️ Tech Stack

- **Client**: [Three.js](https://threejs.org/) (WebGL 3D Rendering), Vanilla JavaScript, CSS3
- **Server**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Audio**: Web Audio API (Synthesized SFX & BGM)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. Built for the **Dlicom AI Game Jam**.

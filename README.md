# FidgetBall - Farcaster Mini App

A 2D ball physics game that responds to your device's gyroscope and accelerometer input. Tilt your device to roll the ball around!

## Features

- **Gyroscope Control**: Tilt your device to control the ball movement
- **Realistic Physics**: Ball bounces off walls with energy loss and friction
- **3D Visual Effects**: Gradient shading and highlights for a 3D appearance
- **Farcaster Integration**: Designed as a Farcaster Frame mini-app
- **Cross-Platform**: Works on mobile devices with motion sensors

## Setup

1. Install dependencies:
```bash
npm install
```

2. For desktop testing:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser

3. **For iOS mobile testing (REQUIRED for gyroscope):**
```bash
npm run dev:https
```
Then:
- Find your computer's IP address (e.g., 192.168.1.100)
- Open `https://YOUR_IP:3001` on your iOS device
- Accept the self-signed certificate warning
- Click "Enable Motion" button to grant gyroscope permissions

## Usage

1. Open the app on a mobile device with gyroscope/accelerometer
2. Click "Enable Motion" to grant device motion permissions
3. Tilt your device to control the ball!

## For Desktop Testing

If you're testing on a desktop without motion sensors, the ball will move in a gentle demo pattern to show the physics simulation.

## Deployment

For Farcaster Frame integration, deploy to a public URL and update the metadata in `app/layout.tsx` with your domain.

## Technologies

- Next.js 14 with App Router
- TypeScript
- HTML5 Canvas
- Device Motion API
- CSS3 with gradients and animations 
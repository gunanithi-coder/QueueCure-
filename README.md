# QueueCure AI

## Problem Statement

Many clinics still rely on paper tokens and manual queue management, resulting in long waiting times, poor visibility for patients, and operational inefficiencies for staff.

QueueCure AI is a real-time clinic queue management platform designed to modernize patient flow and improve the waiting experience.

---

## Features

### Receptionist Dashboard

* Add new patients
* Generate queue tokens
* Call next patient
* Manage queue status
* Configure average consultation time

### Patient Waiting View

* Current token being served
* Queue position tracking
* Tokens ahead in queue
* Estimated waiting time

### Real-Time Synchronization

* Instant queue updates
* Live token status
* No page refresh required

### Smart Queue Management

* Dynamic wait time calculation
* Emergency patient prioritization
* Queue monitoring

### Analytics

* Patient statistics
* Queue performance insights
* Consultation trends

---

## Tech Stack

Frontend

* React
* TypeScript
* Tailwind CSS

Backend

* Node.js
* Express.js
* Socket.IO

Database

* MongoDB

Deployment

* Vercel
* Render

---

## System Architecture

Receptionist Dashboard
↓
Socket.IO Server
↓
MongoDB
↓
Patient Display

---

## Socket Events

* patientAdded
* queueUpdated
* tokenCalled
* patientRemoved
* emergencyInserted

---

## Challenges Solved

* Real-time synchronization across multiple screens
* Dynamic wait time estimation
* Queue consistency during concurrent actions
* Emergency queue handling

---

## Future Enhancements

* QR-based patient tracking
* Voice announcements
* Multi-clinic support
* Predictive wait-time analytics
* Mobile application

---

## Team

QueueCure AI

Built for Queue Cure '26 Hackathon.

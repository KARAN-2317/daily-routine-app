# Daily Routine

A simple student productivity app built to manage daily tasks, study time, and personal goals.

## About the Project

Daily Routine is a student project created by **Karan Dev** using React Native and Expo.

The app helps students organize their everyday routine by adding tasks, selecting specific times, receiving daily reminders, and tracking daily progress.

## Features

- Add daily tasks
- Select a specific time for each task
- Daily task reminders
- Mark tasks as completed
- Delete tasks
- Reset daily tasks
- Track completion progress
- Track remaining tasks
- Current streak tracking
- Automatically save tasks
- About App section
- Clean and simple student-friendly interface

## Technology Used

- React Native
- Expo
- TypeScript
- Expo Router
- AsyncStorage
- Expo Notifications
- React Native DateTimePicker

## Project Structure

```text
daily-routine/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── explore.tsx
│   ├── components/
│   ├── constants/
│   └── hooks/
├── assets/
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
└── README.md
```

## How to Run the Project

### 1. Install dependencies

```bash
npm install
```

### 2. Start the Expo development server

```bash
npx expo start
```

For the Android development build:

```bash
npx expo start --dev-client
```

### 3. Open the App

The project can be opened using an Android development build.

## How the App Works

1. Enter a task name.
2. Select the required time.
3. Tap **Add Task**.
4. The task is added to the daily routine.
5. A daily reminder is scheduled for the selected time.
6. Mark the task as completed when finished.
7. The progress section updates automatically.
8. Tasks are stored locally so they remain available when the app is reopened.

## Project Information

**App Name:** Daily Routine
**Developer:** Karan Dev
**Project Type:** Student Project
**Technology:** React Native + Expo
**Version:** 1.0.0

## Purpose

The purpose of this project is to create a simple mobile application that helps students organize their daily activities, study schedule, and personal goals in one place.

## Future Improvements

Possible future improvements include:

- Weekly and monthly statistics
- Multiple reminder options
- Categories for tasks
- Study-time tracking
- Dark mode
- Cloud data synchronization
- User accounts

## Developer

**Karan Dev**

Made with React Native & Expo.

> Small progress every day leads to big results.
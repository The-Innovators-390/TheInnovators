<p align="center">
  <img width="300" src="assets/README_banner.png" />
</p>

# The Innovators — Concordia Campus Guide App

Welcome to the Innovators Repository!

We are a team of undergraduate Software Engineering students building a next-generation Campus Guide App as part of our Mini-Capstone project. Our mission is to set a new standard for campus navigation and student experience across both the Sir George Williams and Loyola campuses.

Our goal is to deliver a fast, intuitive, and scalable mobile platform that supports both indoor and outdoor navigation, simplifies campus movement, and connects students to all the resources they need — all in one place.

This repository will evolve as we rapidly iterate, ship new features, and continuously improve usability and performance.

---

## Contributors

| Name | Student ID |
|------|-----------|
| Reema Aboudraz| 40253549 |
| Rania Maoukout | 40249281 |
| Lyne Seddaoui | 40252125 |
| Samaya Anwar | 40248167 |
| Rami Al Najem | 40242034 |
| Fouad Meida | 40249310 |
| Akshey Visuvalingam | 40270505 |
| Malak Sefrioui| 40252907 |
| Uroosa Lakhani| 40227274 |
| Vinuya Sivakolunthu| 40278252 |
| Yash Nathani | 4024853 |

---

## Tech Stack

### Frontend / Mobile
- **React Native** — Cross-platform mobile development (iOS & Android)

### Backend
- **Firebase** — Authentication, Firestore database, real-time sync, offline persistence

### Services & APIs
- **Google Maps API** — Interactive campus maps  
- **Google Directions API** — Indoor & outdoor routing  
- **Google Places API** — Location search and points of interest  
- **Google Geocoding API** — Address and coordinate resolution  

### Testing
- **Jest** — Unit and API testing  
- **React Native Testing Library** — Component testing  
- **Detox** — End-to-end (E2E) testing for iOS & Android  
- Automated test execution in CI/CD pipelines  

### CI/CD
- **GitHub Actions**  
  - Automated builds  
  - Continuous integration testing  
  - Frontend & backend deployment pipelines  

---

## Installation & Setup

Follow these steps to run the project locally.

### Prerequisites

Make sure you have the following installed:

- Node.js (v18+ recommended)
- npm or yarn
- Expo CLI
- Git
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

---

### Environment Variables

This project uses environment variables for Firebase and Google API configuration.

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```
#### Notes

- Do not commit `.env` files to GitHub  
- Add `.env` to `.gitignore`  
- Share keys securely within the team  
---


### Clone the Repository

```bash
git clone https://github.com/The-Innovators-390/TheInnovators.git
cd TheInnovators
```
### Run the Project
Install dependencies and start the development server:

```bash
npm install
npx expo start
```

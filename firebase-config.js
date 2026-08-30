// Isi dengan config project Firebase kamu sendiri.
// Ambil dari: Firebase Console → Project Settings → General → "Your apps" → SDK setup and configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAqgVuEQo4rspHAXVXwP3kDlORYZTXVEoU",
  authDomain: "mini-game-survive-60-seconds.firebaseapp.com",
  projectId: "mini-game-survive-60-seconds",
  storageBucket: "mini-game-survive-60-seconds.firebasestorage.app",
  messagingSenderId: "79925989803",
  appId: "1:79925989803:web:f578981faf7cb06f4b02ee",
  measurementId: "G-4CY09Y4WYX"
};

// Nama koleksi Firestore tempat skor disimpan. Bebas diganti.
export const LEADERBOARD_COLLECTION = "leaderboard";
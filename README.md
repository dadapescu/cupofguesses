# Pariul din birou — ghid de instalare

Site de pronosticuri 1/X/2 pentru CM 2026, accesibil de oricine prin link, fara cont.
Datele sunt partajate intre toti colegii prin Firebase. Gazduire pe Vercel.

Timp estimat: ~20 de minute. Nu trebuie sa stii sa programezi — doar copiezi si lipesti.

---

## Ce vei avea la final

Un link de tip `pariul-din-birou.vercel.app` pe care il trimiti colegilor.
Ei il deschid in orice browser (telefon sau laptop), isi pun numele si pot paria.

---

## Pasul 1 — Creeaza proiectul Firebase (baza de date comuna)

1. Intra pe https://console.firebase.google.com si logheaza-te cu un cont Google.
2. Apasa **Add project** (Adauga proiect). Da-i un nume, ex: `pariul-birou`.
   Poti dezactiva Google Analytics, nu e nevoie. Apasa **Create project**.
3. Dupa ce se creeaza, in meniul din stanga intra la **Build → Firestore Database**.
4. Apasa **Create database**. Alege locatia (ex: `europe-west`), apoi alege
   **Start in production mode** si apasa Next/Enable.
5. Dupa ce s-a creat baza, mergi la tabul **Rules** (Reguli) din Firestore.
   Sterge tot ce e acolo si lipeste continutul din fisierul `firestore.rules`
   (din acest proiect). Apasa **Publish**.

## Pasul 2 — Ia cheile Firebase

1. In Firebase, apasa pe iconita de **roata dintata** (sus stanga) → **Project settings**.
2. Scroll jos la sectiunea **Your apps**. Apasa pe iconita **</>** (Web).
3. Da-i un nume (ex: `web`), apasa **Register app**. NU bifa Firebase Hosting.
4. Vei vedea un bloc de cod cu `const firebaseConfig = { ... }`. Acolo sunt cheile tale.
5. Deschide fisierul `src/firebaseConfig.js` din acest proiect si inlocuieste
   fiecare `PUNE_AICI_...` cu valoarea ta din Firebase. Pastreaza ghilimelele.

   Exemplu (valorile tale vor fi diferite):
   ```js
   export const firebaseConfig = {
     apiKey: "AIzaSyB...",
     authDomain: "pariul-birou.firebaseapp.com",
     projectId: "pariul-birou",
     storageBucket: "pariul-birou.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
   };
   ```

## Pasul 3 — Pune codul pe GitHub

1. Fa-ti cont gratuit pe https://github.com daca nu ai.
2. Apasa **New repository**, da-i un nume (ex: `pariul-din-birou`), lasa-l **Public**
   sau **Private** (ambele merg), apasa **Create repository**.
3. Cel mai simplu mod de a urca fisierele: pe pagina noului repository apasa
   **uploading an existing file**, apoi trage TOATE fisierele si folderele din acest
   proiect (mai putin folderul `node_modules` daca apare). Apasa **Commit changes**.

## Pasul 4 — Publica pe Vercel

1. Fa-ti cont gratuit pe https://vercel.com — alege **Continue with GitHub**.
2. Apasa **Add New → Project**, alege repository-ul `pariul-din-birou`.
3. Vercel detecteaza singur ca e Vite. Lasa setarile default si apasa **Deploy**.
4. Dupa ~1 minut primesti un link `https://....vercel.app`. Gata!

## Pasul 5 — Joaca

1. Deschide TU prima link-ul si inscrie-te — primul inscris devine **arbitrul**
   (vede tabul Arbitru, inchide meciuri, adauga fazele eliminatorii).
2. Trimite link-ul colegilor. Fiecare isi pune numele si paraza.

---

## Lucruri bune de stiut

- **Grupele sunt deja incarcate** complet (program oficial, ora Romaniei).
  Verifica orele in tabul Arbitru si corecteaza-le acolo daca FIFA mai schimba ceva.
- **Fazele eliminatorii** (16-imi, optimi etc.) le adaugi manual din tabul Arbitru
  pe masura ce se stabilesc echipele.
- **Rezultatele** le introduci tu, arbitrul, dupa fiecare meci (1/X/2 + scor).
  Cand inchizi un meci, biletele colegilor se dezvaluie automat si se acorda punctele.
- **Secretul biletelor**: fiecare bilet se salveaza pe dispozitivul celui care pariaza
  si nu apare nicaieri public pana la finalul meciului. E bazat pe incredere — cineva
  foarte tehnic ar putea, teoretic, sa caute in baza de date, dar pentru un joc de birou
  e mai mult decat suficient.
- **Acelasi nume pe toate device-urile tale.** Biletele puse pe telefon nu apar pe laptop
  decat dupa ce se desigileaza (la finalul meciului), pentru ca stau local pe device.
- **Costuri: 0 lei.** Firebase si Vercel au planuri gratuite mai mult decat suficiente
  pentru un grup de birou.

## Daca vrei sa rulezi local intai (optional)

Ai nevoie de Node.js instalat. In folderul proiectului:
```
npm install
npm run dev
```
Apoi deschide adresa afisata (ex: http://localhost:5173).

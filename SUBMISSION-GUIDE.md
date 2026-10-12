# Aaj ki submission: step-by-step (Roman Urdu)

## 1. Project run karein

1. ZIP extract karein. `tinyurl-project` folder VS Code mein open karein.
2. Terminal mein `npm install` chalayein.
3. `.env.example` ki copy bana kar `.env` naam dein.
4. `npm run dev` chalayein.
5. Browser mein `http://localhost:5173` open karein.

Local demo ke liye MongoDB install zaroori nahi. Lekin deployed MERN project mein MongoDB connect karna zaroori hai; Railway steps README mein hain.

## 2. Sir ko demo kis order mein dikhana hai

1. Home: responsive navigation aur shortening form.
2. Ek long URL paste karein, custom alias dein, Shorten Link click karein.
3. Naya short link open karein: original website par redirect hona chahiye.
4. Signup karein; phir logged-in state mein ek aur link banayein.
5. My Links: link aur click count dikhayein. Link open karke Refresh Counts karein.
6. Edit: destination badlein, short link dobara open karke naya destination dikhayein.
7. QR generate aur PNG download karein.
8. Search aur delete confirmation dikhayein.
9. Logout aur login demonstrate karein.
10. Plans, Domains, Features, Blog, Developer Guide, Contact aur policy pages dikhayein.
11. Railway URL aur `/api/health` par `database: mongodb` dikhayein.

## 3. Viva ke liye basic explanation

- React frontend user ka input collect karta hai.
- Frontend `/api/links` ko POST request bhejta hai.
- Express URL validate karta hai aur unique short code banata hai.
- MongoDB original URL aur short code save karta hai.
- `/s/:code` request par backend database se destination leta hai.
- Click count increase hota hai aur browser ko HTTP 302 redirect milta hai.
- Password plaintext mein save nahi hota; bcrypt hash save hota hai.
- JWT signed session HTTP-only cookie mein rehti hai.
- nodemon sirf development mein backend restart karta hai.
- Railway production mein `npm start` chalata hai, nodemon nahi.
- React aur Express same deployed domain par hain; Vite local development mein proxy use karta hai.

## 4. Submit karne wali cheezein

- GitHub repository link.
- Railway ki live HTTPS website link.
- Source-code ZIP.
- README aur setup steps.
- Agar required ho to 2–3 minute demo recording.

## 5. Honest scope

Yeh TinyURL-inspired independent educational clone hai. Main workflows working hain. Original service ki har commercial facility include nahi:

- Plans demo hain; payment nahi hoti.
- Contact message database mein save hota hai; email nahi bhejta.
- Analytics total clicks hain; unique visitors ya country/device tracking nahi.
- Domain purchase app ka feature nahi. Railway subdomain deployment settings se generate hota hai.
- Password reset, email verification, API keys, bulk uploads aur multi-tenant domain system include nahi.
- Anonymous links account mein transfer nahi hote. Account ke liye login karke link banayein.

Sir ne agar exact screenshots/layout diye hon to unke mutabiq design adjustments kiye ja sakte hain.


Updated identity: LinkNest, plum/purple with peach accents. Includes the Vite /s/ proxy correction.

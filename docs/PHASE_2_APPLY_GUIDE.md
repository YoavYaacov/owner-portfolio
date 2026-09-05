# Phase 2 — Apply Guide

מדריך יישום שלב-אחר-שלב, מותאם לעבודה דרך GitHub web UI ו-Supabase Dashboard
(כפי שעבדת ב-Phase 1) — אין צורך ב-CLI, אך אפשרויות CLI מצוינות היכן שהן
מהירות יותר.

**חשוב:** אף שלב כאן לא בוצע בפועל על ה-Supabase project או ה-GitHub repo
האמיתיים שלך — לסשן הזה אין גישה אליהם (ראה הסבר בתחילת השיחה). כל מה
שלמטה נבדק בסביבה מקומית (typecheck + build + טסטים + `deno check`/`deno
lint` על ה-Edge Functions) אבל **לא** נבדק end-to-end מול הפרויקט האמיתי
שלך — זה השלב הבא שלך.

---

## 0. מבנה הקבצים שמצורף

```
owner-portfolio/
├── src/                        # React + TypeScript app
├── supabase/
│   ├── migrations/             # 10 המיגרציות מ-Phase 1, בשם/פורמט הנכון
│   │                           # ל-supabase/migrations (סוגר Known Issue #1)
│   └── functions/               # each function is self-contained
│       ├── login-with-username/index.ts
│       └── request-password-reset/index.ts
├── scripts/bootstrap_first_user.sql
├── docs/adr/ADR-015-020-phase2.md
├── .github/workflows/deploy.yml
├── .env.example
├── .gitignore
├── package.json / tsconfig*.json / vite.config.ts / index.html
```

---

## 1. סגירת החוב הטכני: מיגרציות ל-repo

הקבצים תחת `supabase/migrations/` הם אותם 10 קבצי SQL שכבר הרצת ידנית
ב-SQL Editor, רק עם שמות בפורמט הנדרש (`<timestamp>_<name>.sql`). **אל
תריץ אותם שוב על מסד הנתונים** — הוא כבר במצב הזה. פשוט העלה את התיקייה
`supabase/migrations/` ל-GitHub (Add file → Upload files, או git). זה סוגר
את Known Issue #1 ממסמך האב.

---

## 2. יצירת המשתמש הראשון (ADR-017 — ללא Signup UI ב-V1)

1. ב-Supabase Dashboard: **Authentication → Users → Add User**.
   - הזן email אמיתי (חובה — לשם איפוס סיסמה בעתיד) וסיסמה (8+ תווים).
   - העתק את ה-`id` (UUID) של המשתמש שנוצר.
2. פתח **SQL Editor**, הדבק את התוכן של `scripts/bootstrap_first_user.sql`,
   החלף את שלושת הערכים המסומנים (`v_user_id`, `v_username`,
   `v_display_name`), והרץ.
3. ודא: `select * from public.profiles;` ו-`select * from public.usernames;`
   מציגים את המשתמש החדש.

זהו — אין UI של הרשמה. כל משתמש עתידי נוצר באותו אופן (הוזכר כ-Deferred
Feature במסמך האב אם וכאשר תרצה זרימת הזמנה עצמאית).

---

## 3. פריסת שתי ה-Edge Functions

### 3.1 קונפיגורציה נדרשת (חשוב לפני הפריסה)

ב-**Project Settings → Edge Functions → Secrets** (או `supabase secrets set`
אם תבחר ב-CLI), הגדר:

| Secret | ערך | הערה |
|---|---|---|
| `ALLOWED_ORIGIN` | `https://<your-github-username>.github.io` | **בלי** נתיב בסוף, רק ה-origin (ADR-020) |
| `PASSWORD_RESET_REDIRECT_URL` | `https://<your-github-username>.github.io/owner-portfolio/#/reset-password` | ה-URL המלא כולל hash route |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` מוזרקים
אוטומטית לכל Edge Function ע"י Supabase — אין צורך להגדיר אותם ידנית.

ב-**Authentication → URL Configuration → Redirect URLs**, הוסף את אותו
`PASSWORD_RESET_REDIRECT_URL` לרשימת הכתובות המורשות — אחרת
`resetPasswordForEmail` יתעלם מהבקשה בשקט.

### 3.2 פריסה — אפשרות A: Dashboard (ללא CLI)

לכל אחת משתי הפונקציות (`login-with-username`,
`request-password-reset`):

1. **Edge Functions → Create a new function**, תן לה בדיוק את השם הזה
   (חייב להתאים לשם התיקייה).
2. הדבק את תוכן `index.ts` המתאים — הקובץ עצמאי לחלוטין (אין בו import
   מקובץ אחר), כך שהעתקה-הדבקה ישירה שלו עובדת גם בעורך ה-Dashboard וגם
   ב-CLI ללא שינוי. (גרסה מוקדמת יותר של הקבצים ייבאה helper משותף
   מ-`_shared/cors.ts`, מה שגרם לשגיאת "Module not found" בפריסה דרך
   ה-Dashboard — זה תוקן: הקוד המצורף כאן כבר לא תלוי בקובץ הזה.)
3. **חובה**: בהגדרות הפונקציה, כבה **"Verify JWT"** — שתי הפונקציות האלה
   נועדו להיקרא ע"י מבקר לא מחובר (זו הדרך שבה הוא מתחבר בכלל).

### 3.2 פריסה — אפשרות B: CLI (אם תרצה, מהיר יותר)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy login-with-username --no-verify-jwt
npx supabase functions deploy request-password-reset --no-verify-jwt
```

---

## 4. הוספת קבצי ה-Frontend ל-repo

**שלב 0 — חובה:** קודם כל חלץ (unzip) את קובץ ה-ZIP במחשב שלך — אל תעלה
את קובץ ה-ZIP עצמו ל-GitHub! GitHub לא יודע לפתוח ZIP; אם תעלה אותו כמו
שהוא, תקבל קובץ ZIP בודד בתוך ה-repo במקום את הפרויקט עצמו. אחרי החילוץ
תראה תיקייה בשם `owner-portfolio` שמכילה בדיוק את המבנה שמתואר בסעיף 0
למעלה.

עכשיו יש שתי דרכים לקבל את זה ל-repo שלך. שתיהן תקפות — בחר את הנוחה לך:

### דרך א' — GitHub Desktop (הכי פשוט, מומלץ אם זו הפעם הראשונה)

1. הורד והתקן [GitHub Desktop](https://desktop.github.com) והתחבר עם
   חשבון ה-GitHub שלך.
2. **File → Clone repository**, בחר את `YoavYaacov/owner-portfolio`, ושמור
   אותו איפשהו במחשב.
3. פתח את תיקיית ה-repo שהתקבלה (ב-Finder/Explorer) ואת תיקיית
   `owner-portfolio` שחילצת מה-ZIP, זו לצד זו.
4. **גרור את כל התוכן** מתוך תיקיית ה-ZIP המחולצת (כל הקבצים והתיקיות —
   `src`, `supabase`, `docs`, `.github`, `scripts`, וכל הקבצים הבודדים
   כמו `package.json`) **לתוך** תיקיית ה-repo המשוכפלת, ואשר החלפה/מיזוג
   אם נשאל.
5. חזור ל-GitHub Desktop — תראה רשימת שינויים. כתוב הודעת commit (למשל
   "Phase 2: authentication + application shell") ולחץ **Commit to main**,
   ואז **Push origin**.

### דרך ב' — דרך אתר GitHub (Add file → Upload files)

חשוב לדעת: קבצים ששמם מתחיל בנקודה (`.gitignore`, `.env.example`)
**מוסתרים כברירת מחדל** ב-Finder (Mac) וב-Explorer (Windows) — תצטרך
להראות קבצים מוסתרים (Mac: `Cmd+Shift+.` בחלון Finder; Windows: לשונית
View → Show → Hidden items) כדי לראות ולגרור אותם.

1. גש ל-`https://github.com/YoavYaacov/owner-portfolio`.
2. **Add file → Upload files**.
3. גרור לתוך האזור בדפדפן את **כל** התוכן שבתוך תיקיית `owner-portfolio`
   המחולצת בבת אחת — גם את התיקיות (`src`, `supabase`, `docs`,
   `.github`, `scripts`) וגם את הקבצים הבודדים (כולל `.gitignore` ו-
   `.env.example` אחרי שחשפת אותם). דפדפנים תומכים בגרירת תיקיות שלמות
   ושומרים על מבנה תת-התיקיות — **אך רק בגרירה, לא דרך כפתור "choose your
   files"**, שבדרך כלל מאפשר לבחור קבצים בודדים בלבד ולא תיקיות.
4. גלול למטה, כתוב הודעת commit, ולחץ **Commit changes**.

אם משהו לא נראה כמו שציפית אחרי ההעלאה (למשל תיקייה חסרה, או קובץ בודד
במקום תיקייה) — כנראה שהוא לא נגרר נכון; פתח את התיקייה החסרה בנפרד
וגרור את התוכן שלה כהעלאה נוספת.

**אל תעלה `.env.local`** אם יצרת כזה מקומית לבדיקה — הוא כבר ב-`.gitignore`
(וגם אם בטעות תגרור אותו, כדאי למחוק אותו מה-repo אחר כך — הוא מכיל את
המפתחות שלך).

---

## 5. הגדרת GitHub Repository Secrets + Pages

1. **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL` = כתובת ה-project שלך (`https://<ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = ה-anon/public key (מ-Project Settings → API)
2. **Settings → Pages → Build and deployment → Source**: בחר
   **"GitHub Actions"** (לא "Deploy from a branch").
3. Push ל-`main` (או Run workflow ידנית מ-Actions) — ה-workflow יבדוק
   types, ירוץ טסטים, יבנה, ויפרוס.

כתובת האתר תהיה: `https://<your-github-username>.github.io/owner-portfolio/`

---

## 6. בדיקה מקומית לפני push (מומלץ)

```bash
npm install
cp .env.example .env.local   # מלא ערכים אמיתיים
npm run typecheck
npm test
npm run dev
```

---

## 7. Checklist בדיקה (SRS §22 — Critical Flow)

- [ ] כניסה עם שם משתמש+סיסמה נכונים → מגיע ל-Dashboard
- [ ] כניסה עם שם משתמש/סיסמה שגויים → הודעת שגיאה זהה בשני המקרים (לא
      חושף אם שם המשתמש קיים)
- [ ] רענון הדף בזמן שמחוברים → נשאר מחובר (לא קופץ ל-login)
- [ ] "התנתקות" → חוזר למסך login, וחזרה ל-`/dashboard` ידנית מפנה ל-login
- [ ] "שכחת סיסמה" עם שם משתמש קיים → מייל מגיע, ההודעה במסך זהה גם אם
      שם המשתמש לא קיים
- [ ] לחיצה על הקישור במייל → נוחת על מסך "קביעת סיסמה חדשה" (**זה השלב
      הכי חשוב לבדוק** — הזרימה הזו תלויה באינטראקציה בין HashRouter
      לבין הקישור של Supabase, ראה ADR-018; אם היא לא עובדת כמצופה,
      דרוש debugging נוסף לפני שאפשר לסמן את Phase 2 כ-Done)
- [ ] קביעת סיסמה חדשה → מתנתק אוטומטית, מתחבר עם הסיסמה החדשה בהצלחה
- [ ] גישה ישירה ל-`/#/dashboard` בלי session → מפנה ל-`/#/login`
- [ ] אין שגיאות ב-Console בדפדפן באף אחד מהתרחישים לעיל

---

## 8. ידוע כפתוח / Deferred

- ראה `docs/MASTER_PROJECT_DOCUMENT_v1.3.md` → Known Issues / Deferred
  Features.

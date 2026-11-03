
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
<img width="1158" height="465" alt="image" src="https://github.com/user-attachments/assets/ef9966fa-e9a4-4ef3-9646-219de216dd07" />


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
<img width="1243" height="548" alt="image" src="https://github.com/user-attachments/assets/bc0c54fb-3b43-4cf2-8a88-5045b35337a7" />


You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

<img width="1190" height="638" alt="image" src="https://github.com/user-attachments/assets/12af675f-23d3-45e5-a0b8-bcdfdf032551" />
<img width="1189" height="592" alt="image" src="https://github.com/user-attachments/assets/70f9c99d-b904-436c-8901-517c6062650f" />

<img width="1195" height="402" alt="image" src="https://github.com/user-attachments/assets/19dfe940-5345-446f-91d5-69e10fc442d1" />

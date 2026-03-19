To start the backend server: 
- at the root level of the code, make sure you have a .env file
- to the file add: 
EXPO_PUBLIC_API_URL=http://localhost:3001
^^ This is fine to run locally. However if you want to test the back end and front end on a different device, replace it with your IP address. 

cd backend
npm install
npm run dev

to start the frontend: 

npm install
npx expo start 





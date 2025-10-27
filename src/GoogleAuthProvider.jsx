import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; // Replace with your actual Google Client ID

function GoogleAuthProvider({ children }) {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default GoogleAuthProvider;


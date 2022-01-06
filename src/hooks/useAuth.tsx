import { makeRedirectUri, revokeAsync, startAsync } from 'expo-auth-session';
import React, {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { generateRandom } from 'expo-auth-session/build/PKCE';
import { api } from '../services/api';

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: 'https://id.twitch.tv/oauth2/authorize',
  revocation: 'https://id.twitch.tv/oauth2/revoke',
};

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState('');

  // get CLIENT_ID from environment variables
  const { CLIENT_ID } = process.env;

  async function signIn() {
    try {
      // set isLoggingIn to true
      setIsLoggingIn(true);

      // REDIRECT_URI - create OAuth redirect URI using makeRedirectUri() with "useProxy" option set to true
      const REDIRECT_URI = makeRedirectUri({ useProxy: true });
      // RESPONSE_TYPE - set to "token"
      const RESPONSE_TYPE = 'token';
      // SCOPE - create a space-separated list of the following scopes: "openid", "user:read:email" and "user:read:follows"
      const SCOPE = encodeURI('openid user:read:email user:read:follows');
      // FORCE_VERIFY - set to true
      const FORCE_VERIFY = true;
      // STATE - generate random 30-length string using generateRandom() with "size" set to 30
      const STATE = generateRandom(30);

      // assemble authUrl with twitchEndpoint authorization, client_id,
      // redirect_uri, response_type, scope, force_verify and state
      const authUrl =
        twitchEndpoints.authorization +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${REDIRECT_URI}` +
        `&response_type=${RESPONSE_TYPE}` +
        `&scope=${SCOPE}` +
        `&force_verify=${FORCE_VERIFY}` +
        `&state=${STATE}`;

      // call startAsync with authUrl
      const authResponse = await startAsync({ authUrl });
      if (
        authResponse.type === 'success' &&
        authResponse.params.error !== 'access_denied'
      ) {
        if (authResponse.params.state === STATE) {
          throw new Error('State does not match');
        }

        api.defaults.headers.authorization = `Bearer ${authResponse.params.access_token}`;
        // call api with authReponse.params.code
        const { data } = await api.post('/users');
        // set user to data.user
        setUser({
          id: data.data[0].id,
          display_name: data.data[0].display_name,
          email: data.data[0].email,
          profile_image_url: data.data[0].profile_image_url,
        });
      }

      // set userToken to data.token
      setUserToken(authResponse.params.access_token);
    } catch (error: any) {
      // throw an error
      throw new Error(error);
    } finally {
      // set isLoggingIn to false
      setIsLoggingIn(false);
    }
  }

  async function signOut() {
    try {
      // set isLoggingOut to true
      setIsLoggingOut(true);
      // call revokeAsync with access_token, client_id and twitchEndpoint revocation
      await revokeAsync(
        {
          token: userToken,
          clientId: CLIENT_ID,
        },
        { revocationEndpoint: twitchEndpoints.revocation }
      );
    } catch (error: any) {
      // throw an error
      throw new Error('error');
    } finally {
      // set user state to an empty User object
      setUser({} as User);
      // set userToken state to an empty string
      setUserToken('');
      // remove "access_token" from request's authorization header
      delete api.defaults.headers.authorization;
      // set isLoggingOut to false
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    api.defaults.headers['Client-Id'] = CLIENT_ID;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };

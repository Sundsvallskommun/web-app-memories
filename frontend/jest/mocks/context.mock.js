import * as AppContext from '@contexts/app.context';
import {
    user,
} from './data.mock.js';

export const contextValues = {
    isLoggedIn: true,
    setIsLoggedIn: jest.fn(),
    user: user,
    setUser: jest.fn(),
    isCookieConsentOpen: true,
    setIsCookieConsentOpen: jest.fn(),
};

jest.spyOn(AppContext, 'useAppContext')
	.mockImplementation(() => contextValues);
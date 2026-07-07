export interface JwtPayload {
    userId: string;
    email: string;
    jti: string;
}
export interface TokenPayload {
    accessToken: string;
    refreshToken: string;
}
export declare function generateTokens(userId: string, email: string): TokenPayload;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;

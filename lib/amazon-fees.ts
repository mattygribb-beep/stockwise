export const AMAZON_UK_MARKETPLACE_ID='A1F83G8C2ARO7P'
export const AMAZON_EU_SP_API='https://sellingpartnerapi-eu.amazon.com'
export type AmazonFeeStatus='CONNECTED'|'NOT_CONFIGURED'
export function amazonFeeConfig(){const clientId=process.env.AMAZON_LWA_CLIENT_ID,clientSecret=process.env.AMAZON_LWA_CLIENT_SECRET,refreshToken=process.env.AMAZON_SP_API_REFRESH_TOKEN;return{status:(clientId&&clientSecret&&refreshToken?'CONNECTED':'NOT_CONFIGURED') as AmazonFeeStatus,marketplaceId:process.env.AMAZON_MARKETPLACE_ID||AMAZON_UK_MARKETPLACE_ID,endpoint:AMAZON_EU_SP_API,configured:{clientId:!!clientId,clientSecret:!!clientSecret,refreshToken:!!refreshToken}}}

<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet xmlns:lxslt="http://xml.apache.org/xslt"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:output method="html" />

    <xsl:template match="/">
        <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Open+Sans&amp;display=swap');

                    body {
                        font-family: 'Open Sans', sans-serif;
                    }
                    .OpenSans700{
						font-family: 'Open Sans', sans-serif;
						font-weight: 700;
					}
                    .parentFlex{
                        display: flex;
                        align-items: center;
						justify-content: center;
                    }
                    .selfCenter{
                    	align-self : center;
                    }
                    .buttonConfirm{
                    	-webkit-text-size-adjust: none;
                    	text-decoration: none;
                    	display: block;
                    	color: #ffffff;
                    	background-color: #3880FF;
                    	border-radius: 5px;
                    	-webkit-border-radius: 5px;
                    	-moz-border-radius: 5px;
                    	width: 40%; width: calc(40% - 2px);
                    	border-top: 1px solid #3880FF;
                    	border-right: 1px solid #3880FF;
                    	border-bottom: 1px solid #3880FF;
                    	border-left: 1px solid #3880FF;
                    	padding-top: 5px; padding-bottom: 5px;
                    	text-align: center;
                    	mso-border-alt: none;
                    	word-break: keep-all;
                    }
                    .innerButtonConfirm {
                    	padding-left:20px;
                    	padding-right:20px;
                    	font-size:14px;
                    	display:inline-block;
                    }
                </style>
            </head>
            <body>
                <div class="parentFlex">
                    <div class="selfCenter parentFlex" style="margin-right: 20px">
                        <img style="display: block; margin: auto;max-width:50px"
                        src="{//logo}" />
                    </div>
                    <div>
                        <h2 class="OpenSans700" >Confirmation de création de compte</h2>
                    </div>
                </div>
                <p>Dear user,</p>
                <p>Thank you for creating an account with us. In order to complete your registration, we need to verify that this email address is valid.</p>
                <p>Please click on <a href="{//confirmURL}" >this link</a> or the below button to confirm your email:</p>
                <a href="{//confirmURL}" class="buttonConfirm" target="_blank">
					<span class="innerButtonConfirm">
						<span style="font-size: 16px; line-height: 28px;">
							<span style="font-size: 14px; line-height: 25px; color: #ffffff;">Confirm my email adress</span>
						</span>
					</span>
				</a>
                <p>If you did not request this email, please ignore it and your account will not be activated.</p>
                <p>Thank you for your attention.</p>
                <p>Best regards,</p>
                <p><xsl:value-of select="//appName" /></p>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>

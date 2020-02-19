<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:lxslt="http://xml.apache.org/xslt"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
	<xsl:output encoding="UTF-8" indent="no"
		media-type="text/html" method="html" />
	<xsl:template match="document">
		<html>
			<head>
				<meta name="viewport" content="width=device-width" />
				<meta http-equiv="Content-Type"
					content="text/html; charset=UTF-8" />
				<title>Simple Transactional Email</title>
				<style>
					/* -------------------------------------
					INLINED WITH
					htmlemail.io/inline
					------------------------------------- */
					/*
					-------------------------------------
					RESPONSIVE AND MOBILE FRIENDLY
					STYLES
					------------------------------------- */
					@media only screen
					and (max-width: 620px) {
					table[class=body] h1 {
					font-size: 28px
					!important;
					margin-bottom: 10px !important;
					}
					table[class=body] p,
					table[class=body] ul,
					table[class=body] ol,
					table[class=body] td,
					table[class=body] span,
					table[class=body] a {
					font-size: 16px
					!important;
					}
					table[class=body] .wrapper,
					table[class=body] .article {
					padding: 10px !important;
					}
					table[class=body] .content {
					padding: 0
					!important;
					}
					table[class=body] .container {
					padding: 0 !important;
					width: 100% !important;
					}
					table[class=body] .main {
					border-left-width: 0 !important;
					border-radius: 0 !important;
					border-right-width: 0 !important;
					}
					table[class=body] .btn table {
					width: 100% !important;
					}
					table[class=body] .btn a {
					width: 100%
					!important;
					}
					table[class=body] .img-responsive {
					height: auto
					!important;
					max-width: 100% !important;
					width: auto !important;
					}
					}

					/*
					-------------------------------------
					PRESERVE THESE STYLES IN THE
					HEAD
					------------------------------------- */
					@media all {
					.ExternalClass {
					width: 100%;
					}
					.ExternalClass,
					.ExternalClass p,
					.ExternalClass span,
					.ExternalClass font,
					.ExternalClass td,
					.ExternalClass div {
					line-height: 100%;
					}
					.apple-link a {
					color:
					inherit !important;
					font-family: inherit !important;
					font-size:
					inherit !important;
					font-weight: inherit !important;
					line-height:
					inherit !important;
					text-decoration: none !important;
					}
					.btn-primary
					table td:hover {
					background-color: #34495e !important;
					}
					.btn-primary
					a:hover {
					background-color: #34495e !important;
					border-color: #34495e
					!important;
					}
					}
				</style>
			</head>


			<body class=""
				style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
				<table class="body"
					style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f6f6f6;"
					border="0" cellspacing="0" cellpadding="0">
					<tbody>
						<tr>
							<td
								style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&#160; </td>
							<td class="container"
								style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;">
								<div class="content"
									style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
									<table class="main"
										style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #ffffff; border-radius: 3px;"><!-- START MAIN CONTENT AREA -->
										<tbody>
											<tr>
												<td class="wrapper"
													style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;">
													<table
														style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;"
														border="0" cellspacing="0" cellpadding="0">
														<tbody>
															<tr>
																<td
																	style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
																	<img
																		style="display: block; margin-left: auto; margin-right: auto;"
																		src="{//logo}" />
																</td>
															</tr>
															<tr>
																<td
																	style="font-family: sans-serif; font-size: 14px; vertical-align: top;">
																	<br />
																	<xsl:value-of select="//body" />
																</td>
															</tr>
														</tbody>
													</table>
												</td>
											</tr>
										</tbody>
									</table>

									<br /><br />
									
									<center>
										<a href="{//confirmURL}"
											style="-webkit-text-size-adjust: none; text-decoration: none; display: block; color: #ffffff; background-color: #7c4b96; border-radius: 5px; -webkit-border-radius: 5px; -moz-border-radius: 5px; width: 40%; width: calc(40% - 2px); border-top: 1px solid #7c4b96; border-right: 1px solid #7c4b96; border-bottom: 1px solid #7c4b96; border-left: 1px solid #7c4b96; padding-top: 5px; padding-bottom: 5px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; text-align: center; mso-border-alt: none; word-break: keep-all;"
											target="_blank">
											<span
												style="padding-left:20px;padding-right:20px;font-size:14px;display:inline-block;">
												<span style="font-size: 16px; line-height: 28px;">
													<span style="font-size: 14px; line-height: 25px;">Reset password</span>
												</span>
											</span>
										</a>
									</center>

									<br /><br />

								</div>
							</td>
							<td
								style="font-family: sans-serif; font-size: 14px; vertical-align: top;">&#160; </td>
						</tr>
					</tbody>
				</table>

			</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
		
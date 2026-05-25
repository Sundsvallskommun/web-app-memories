<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                 xmlns:xhtml="http://www.w3.org/1999/xhtml"
                 version="1.0">
  <xsl:template match="/">
    <HTML>
      <head>
        <style type="text/css">
          <!--
		      .TableData {
		       font-family: Verdana, Arial, Helvetica, sans-serif;
		       font-size: 9px;
		       font-weight: normal;
		       }
		      .TableHead {
		       font-family: Verdana, Arial, Helvetica, sans-serif;
		       font-size: 9px;
		       font-weight: boldl;
		       }		       
		      -->
        </style>
      </head>
      
      <BODY bgcolor="#CCCCCC">
        <div style="	position: relative;
	max-width: 500px;
	padding: 50px;

	background-color: #fff;
	-webkit-box-shadow: 0 0 4px rgba(0, 0, 0, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.1);
	-moz-box-shadow: 0 0 4px rgba(0, 0, 0, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.1);
	box-shadow: 0 0 5px rgba(0, 0, 0, 0.2), inset 0 0 50px rgba(0, 0, 0, 0.1);">
        <TABLE style="max-width:495px;" border="0" cellpadding="1" cellspacing="0" bgcolor="#ffffff">
          <TR>
            <TD style="max-width:495px;">
              <TABLE style="max-width:495px;" cellspacing="15" border="0" bgcolor="#FFFFFF">
                <TR>
                  <TD style="max-width:495px;">
                    <xsl:apply-templates/>
                  </TD>
                </TR>
              </TABLE>
            </TD>
          </TR>
        </TABLE>
        </div>
      </BODY>
      
    </HTML>
    
  </xsl:template>


  <xsl:template match= "Description">

    <DIV STYLE = "font-family:'Times New Roman' ; font-style:italic ; font-size:9pt ; margin-bottom:3pt ; border-top:1pt #000000 ; border-right:1pt ; border-bottom:1pt ; border-left:1pt ;  ">
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "Document">

    <DIV>
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "Image">

    <DIV STYLE = "font-family:Arial ; font-style:italic ; font-size:11pt ; margin-top:14pt ; margin-bottom:14pt ; background-color:#ffffff ; border:1pt black solid ;  ">
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "Para">

    <DIV STYLE = "font-family:'Times New Roman' ; font-weight:normal ; font-size:11pt ; font-style:normal ; margin-bottom:5pt ;  ">
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "SubTitle">

    <DIV STYLE = "font-family:Arial ; font-weight:bold ; font-size:12pt ; margin-bottom:3pt ; margin-top:4pt ;  ">
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "Table">

    <DIV>
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "Title">

    <DIV STYLE = "font-family:Arial ; font-weight:bold ; font-size:14pt ; margin-bottom:4pt ;  ">
      <xsl:apply-templates/>

    </DIV>
  </xsl:template>



  <xsl:template match= "CAPTION">

    <SPAN STYLE = "font-family:Arial ; font-weight:bold ; font-size:11pt ;  ">
      <xsl:apply-templates/>

    </SPAN>
  </xsl:template>



  <!-- HTML table -->

  <xsl:template match = "TABLE">
    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:if test = "CAPTION">
        <CAPTION>
          <xsl:apply-templates select = "CAPTION"/>
        </CAPTION>
      </xsl:if>
      <xsl:apply-templates select = "THEAD|TBODY|TFOOT|TR"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match = "THEAD">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "TBODY">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "TFOOT">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "TR">

    <xsl:copy>
      <!--xsl:copy-of select = "@*"/-->
      <tr bgcolor="#ffffff" style="font-family:'Verdana', 'Arial', 'Helvetica', 'sans-serif'; font-size: 9pt;">
        <xsl:apply-templates/>
      </tr>
    </xsl:copy>
  </xsl:template>
  <xsl:template match = "TH">

    <!--xsl:copy-->
    <!--xsl:copy-of select = "@*"/-->
    <th class="TableHead">
      <xsl:value-of select="."/>
    </th>
    <!--/xsl:copy-->
  </xsl:template>
  <xsl:template match = "TD">

    <!--xsl:copy-->
    <!--xsl:copy-of select = "@*"/-->
    <td class="TableData">
      <xsl:value-of select="."/>
    </td>
    <!--/xsl:copy-->
  </xsl:template>
  <!-- xhtml table -->

  <xsl:template match = "xhtml:table">
    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:if test = "xhtml:caption">
        <caption>
          <xsl:apply-templates select = "xhtml:caption"/>
        </caption>
      </xsl:if>
      <xsl:apply-templates select = "xhtml:thead|xhtml:tbody|xhtml:tfoot|xhtml:tr"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match = "xhtml:thead">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "xhtml:tbody">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "xhtml:tfoot">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "xhtml:tr">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "xhtml:th">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
  <xsl:template match = "xhtml:td">

    <xsl:copy>
      <xsl:copy-of select = "@*"/>
      <xsl:apply-templates/>

    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>
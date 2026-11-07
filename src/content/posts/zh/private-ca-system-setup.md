---
title: 搭建私有CA认证体系
date: 2021-07-27
tags: [SSL/TLS, CA, 电子证书, OpenSSL]
---

## 0x00 前言

最近发现许多地方都要用自签名证书，大到局域网内的各种基于SSL的服务，中到OpenVPN的虚拟以太网桥，小到HTTPS抓包。如果每个地方都使用新的自签名证书（而且通常还是CA证书），那么就会有许多问题出现，例如：

- 证书散乱，不成体系，不方便管理；
- 证书都为CA证书，一旦泄露就有无穷的隐患；
- 有些地方需要一个证书信任链，而不是单独、零散的CA证书。例如OpenVPN的虚拟以太网桥需要服务器和客户端使用不同的证书，但是这些证书需要在同一个根CA下。

本篇文章就来探讨一下，如何搭建一个完整的CA认证体系，包括证书吊销功能。

## 0x01 开始之前

本篇文章需要一定的知识储备作为铺垫，需要读者：

1. 知晓电子签名的概念及基本运作方式；
1. 掌握电子证书及其基本结构；
1. 了解OpenSSL的基本使用方法。

## 0x02 正式开始

### 创建根CA

#### 创建工作目录环境

创建工作环境，目录树如下[^eolWindows]：

```plain
.                 // 当前CA的工作目录
│  crlnumber      // 当前CRL号，需要有初始值"01"
│  index.txt      // 索引文件
│  root.cnf       // OpenSSL配置文件
│  serial         // 当前证书编号，需要有初始值"01"
│
├─cacert          // CA证书存放处
│  │
│  └─private      // CA私钥存放处
│
├─certs           // CA签发过的证书存放处
├─crl             // CA签发过的CRL存放处
└─newcerts        // 新证书存放处
```

[^eolWindows]:
    对于Windows用户来说，**所有的文本文件的行尾一定要是`LF`**，而不是Windows默认的`CR/LF`。\
    尤其对于`index.txt`，一定要保证为`LF`，否则撤回证书时会出错。\
    可以使用`dos2unix`等工具将文本文件的行尾转换为`LF`，或者使用各种高级文本编辑器转换行尾。

#### 编写OpenSSL配置文件

[参考文档](https://www.openssl.org/docs/manmaster/man5/x509v3_config.html)

1. 从[此处](https://github.com/openssl/openssl/blob/master/apps/openssl.cnf)[^codeOpenSSLConfigTemplate]获取OpenSSL的模板配置文件，复制并保存到`root.cnf`中；
1. 如果配置完成后，出现类似下面的报错，请注释`openssl_conf`项：
   ```plain
   Error configuring OpenSSL modules
   19568:error:25078067:DSO support routines:win32_load:could not load the shared library:crypto\dso\dso_win32.c:108:filename(providers.dll)
   19568:error:25070067:DSO support routines:DSO_load:could not load the shared library:crypto\dso\dso_lib.c:162:
   19568:error:0E07506E:configuration file routines:module_load_dso:error loading dso:crypto\conf\conf_mod.c:224:module=providers, path=providers
   19568:error:0E076071:configuration file routines:module_run:unknown module name:crypto\conf\conf_mod.c:165:module=providers
   ```
1. 取消注释`extensions`项，并将其值设置为`v3_req`。这一步是让`x509`模块为本CA生成`X.509 V3`版证书，并使用`v3_req`中提供的信息。
1. 编辑`[ ca ]`段：将`default_ca`的值改为`ca_root`；
1. 将`[ CA_default ]`段重命名为`[ ca_root ]`；
1. 编辑`[ ca_root ]`段：
   1. `dir`为此CA所有内容所在的目录，这里使用`./`；
   1. `certificate`为此CA的证书，这里使用`$dir/cacert/root.crt`；
   1. `crl`为当前的CRL文件，这里使用`$dir/crl/root.crl`；
   1. `private_key`为此CA的私钥，这里使用`$dir/cacert/private/root.key`；
   1. 取消注释`copy_extensions`：将CSR中的`req_extensions`复制到证书里，但不会覆盖掉`[ ca_root ]`段中`x509_extensions`指定的项目；
   1. 设置`default_days`为`3650`：此CA默认签发10年有效期证书；
   1. 设置`policy`为`policy_default`；
1. 在`[ policy_anything ]`段的后面新建`[ policy_default ]`段，并编辑为：

   ```ini
   [ policy_default ]
   countryName     = supplied
   stateOrProvinceName = supplied
   localityName        = optional
   organizationName        = supplied
   organizationalUnitName  = optional
   commonName          = supplied
   emailAddress        = optional
   ```

   其中：
   - `supplied`表示待签发的CSR必须含有的项；
   - `optional`表示可选项。

   可根据自己的要求修改。

1. 编辑`[ req ]`段：
   1. `default_bits`为生成CSR并同时生成新RSA私钥的长度，这里使用`4096`；
   1. `default_keyfile`为未指定相关选项时私钥存放的位置，这里使用`private.key`；
   1. `x509_extensions`设置为`v3_req`；
1. 编辑`[ req_distinguished_name ]`段：
   1. 我这里将后缀为`_default`、`_min`和`_max`的项全都注释了，因为会报错；
   1. `countryName`为两字符国家代码，这里使用`CN`；
   1. `stateOrProvinceName`为州或省份名称，这里使用`Beijing`；
   1. `localityName`为区域名称（一般为城市），这里注释掉不填；
   1. `0.organizationName`为组织名称，这里使用`wxx9248.tk`；
   1. `organizationalUnitName`为部门名称，这里注释掉不填；
   1. `commonName`为公用名，一般为全限定域名（FQDN）或为CA名称，这里使用`wxx9248 Root Certification Authority`；
   1. `emailAddress`为电子邮件，这里使用`wxx9248@qq.com`
1. 编辑`[ usr_cert ]`段：
   1. `basicConstraints`设置为`critical, CA:TRUE`，因为我们要用此CA签发次级CA证书；
   1. 取消注释`keyUsage`，并将其值设置为`nonRepudiation, digitalSignature, keyCertSign, cRLSign`；
1. 编辑`[ v3_req ]`段：
   1. `basicConstraints`设置为`critical, CA:TRUE`，因为我们要申请此CA为一个CA；
   1. `keyUsage`设置为`nonRepudiation, digitalSignature, keyCertSign, cRLSign`；

#### 创建根CA证书

> 根CA证书是一切信任链的源头，十分重要。它在这个世界上只有你一个人，请好好保管它（雾）

1. 生成一个私钥\
   使用OpenSSL的`genrsa`模块生成一个4096位RSA私钥，文件名为`root.key`，PEM格式（OpenSSL 1.x为PKCS#1，OpenSSL 3为PKCS#8），使用`AES-256-CBC`加密：
   ```bash
   openssl genrsa -aes-256-cbc -out cacert/private/root.key 4096
   ```
1. 生成证书签名请求（CSR）文件\
   使用OpenSSL的`req`模块生成一个CSR文件，文件名为`root.csr`，PKCS#10/PEM格式：
   ```bash
   openssl req -new -key cacert/private/root.key -out cacert/root.csr -config root.cnf
   ```
1. 签发自签名证书

   > 注：正常来讲，签发证书应该是将CSR文件发送给CA进行审核，但是根CA没有上级CA，所以我们需要进行自签名。

   使用OpenSSL的`x509`模块签发证书，签发时长约为100年，证书文件名为`root.crt`，X.509/PEM格式：

   ```bash
   openssl x509 -req -days 36500 -in cacert/root.csr -signkey cacert/private/root.key -out cacert/root.crt -extfile root.cnf
   ```

### 搭建CRL/OCSP服务器

#### 证书吊销列表（CRL, Certificate Revocation List）

CRL在公钥体系（PKI, Public Key Infrastructure）中扮演了十分重要的角色，它保证了CA对其签发的证书的控制。如果一个未指定CRL的证书被签发，那么此证书就不能提前被吊销，只能等待证书过期。而如果此证书的私钥在有效期内被泄露，结果将是灾难性（且不可控）的。

> 这里使用上面搭建的根CA进行演示。

1. 生成CRL

   > 注：CRL需要在其到期日期前按时生成

   使用OpenSSL的`ca`模块生成CRL文件，文件名为`root.crl`：

   ```bash
   openssl ca -gencrl -out crl/root.crl -config root.cnf
   ```

1. 编辑OpenSSL配置文件
   1. 假设公开的URL为`https://crl.wxx9248.tk/root.crl`；
   1. 编辑`root.cnf`的`[ usr_cert ]`段，在段末尾加入如下内容：

      ```ini
      crlDistributionPoints = cdp

      [ cdp ]
      fullname = @cdp_uri

      [ cdp_uri ]
      URI.1 = https://crl.wxx9248.tk/root.crl
      ```

   1. 在此之后，此CA的CRL信息会被写入每一个被签发的证书里。
1. 吊销证书
   ```bash
   openssl ca -revoke certs/random.crt -config root.cnf
   ```

#### 在线证书状态协议（OCSP, Online Certificate Status Protocol）

CRL需要指定一个更新间隔，通常为30天。浏览器会按照CRL中指示的下次更新时间来更新本地的CRL。但是如果在更新间隔内有证书被吊销，浏览器不会第一时间知道该证书被吊销，从而留下一些隐患。OCSP则是为了弥补CRL的这一缺点。浏览器会在收到证书时向OCSP服务器发送请求，查询该证书的情况，而服务器会当即在数据库内查找并回应。并且，OCSP只会响应当前证书的吊销信息，而不会响应整个吊销列表，所以OCSP的效率也更高。

> OpenSSL的`ocsp`模块可以充当一个简单的OCSP响应服务器，不过这里略过OCSP服务器搭建 ~~（懒~~

### 创建次级CA

> 这次我们生成一个ECC证书，换个口味（雾）

#### 创建工作目录环境

> 与根CA的目录结构相同，请参考[创建根CA](#创建根ca)

#### 编写OpenSSL配置文件

1. 将`root.cnf`复制一份到次级CA工作目录下，命名为`ecc.cnf`，在此基础上进行编辑；
1. 编辑`[ ca ]`段：将`default_ca`的值改为`ca_ecc`；
1. 将`[ ca_root ]`段重命名为`[ ca_ecc ]`；
1. 编辑`[ ca_ecc ]`段：
   1. `certificate`使用`$dir/cacert/ecc.crt`；
   1. `crl`使用`$dir/crl/ecc.crl`；
   1. `private_key`使用`$dir/cacert/private/ecc.key`；
   1. `copy_extensions`保持为`copy`：不要设置为`copyall`，否则CSR中的项目会覆盖`x509_extensions`，申请者就可以让此CA签发出CA证书；
   1. `default_days`设置为`365`：此CA默认签发1年有效期的证书；
1. 编辑`[ req_distinguished_name ]`段：`commonName`使用`wxx9248 ECC Certification Authority`；
1. 编辑`[ usr_cert ]`段：
   1. `basicConstraints`设置为`critical, CA:FALSE`：此CA不签发下级CA证书，只签发用户证书；
   1. `keyUsage`设置为`critical, nonRepudiation, keyEncipherment, digitalSignature`；
1. 编辑`[ cdp_uri ]`段：将`URI.1`设置为`https://crl.wxx9248.tk/ecc.crl`；

#### 创建次级CA证书

1. 生成一个ECC私钥\
   使用OpenSSL的`ecparam`模块生成一个ECC私钥，使用曲线`secp384r1`，文件名为`ecc.key`，SEC1/PEM格式；

   ```bash
   openssl ecparam -genkey -name secp384r1 -noout -out cacert/private/ecc.key
   ```

   > 注：SSL证书的ECC曲线一般选择`prime256v1`或`secp384r1`（NIST标准），前者密钥长度为256位，后者密钥长度为384位。\
   > 其他曲线的兼容性较差，使用前需要确认客户端支持。

1. 生成证书签名请求（CSR）文件\
   使用OpenSSL的`req`模块生成一个CSR文件，文件名为`ecc.csr`，PKCS#10/PEM格式：
   ```bash
   openssl req -new -key cacert/private/ecc.key -out cacert/ecc.csr -config ecc.cnf
   ```
1. 使用根CA签发证书\
   将`ecc.csr`复制或者链接到**根CA**的工作目录，在根CA的工作目录下执行：
   ```bash
   openssl ca -in ecc.csr -out ecc.crt -config root.cnf -notext
   ```
   然后OpenSSL会打印CSR的信息，询问是否签署证书，两次输入`y`以签署证书，证书被写入到`ecc.crt`中。\
   之后，我们只需要将`ecc.crt`复制到次级CA的工作目录下的`cacert`文件夹内就完成了此次级CA的部署。

### 使用次级CA签发用户证书

> 这里假设签发OpenVPN的服务器和客户端证书

1. 生成一个私钥，文件名为`ovpn_server.key`；
1. 编辑简化版配置文件：
   ```ini
   [ req ]
   distinguished_name  = req_distinguished_name
   req_extensions  = v3_req
   prompt = no

   [ req_distinguished_name ]
   countryName         = CN
   stateOrProvinceName     = Beijing
   #localityName           =
   0.organizationName          = wxx9248.tk
   #1.organizationName     = Second Organization Name (eg, company)
   #organizationalUnitName     = wxx9248.tk
   commonName              = OpenVPN Server Certificate
   emailAddress            = wxx9248@qq.com

   [ v3_req ]
   basicConstraints = critical, CA:FALSE
   keyUsage = critical, nonRepudiation, keyEncipherment, keyAgreement
   extendedKeyUsage = serverAuth, clientAuth
   ```
1. 生成CSR；
1. 将CSR复制到次级CA的工作目录中，签发证书。
1. 将次级CA的证书和用户证书合并成完整证书，文件名为`ovpn_server_fullchain.crt`：
   ```bash
   cat ovpn_server.crt ecc.crt >ovpn_server_fullchain.crt
   ```

## 0x03 结语

这篇文章看着写起来很简单，但是实际上花费了我很长一段时间。主要原因有下：

1. OpenSSL的配置文件很混乱……很多配置项的命名很迷惑人，文档也没有清楚区分这些看起来相似的项目有什么区别，也就没办法只靠文档来确切地知道某个项目的作用。必须要经过很多次尝试，对比结果才知道；
1. 网上资料众说纷纭，很难辨别哪些部分是准确的。我综合了很多篇文章，很多篇Stack Overflow回答得出自己认为准确的理解。当然，也不会是绝对准确，还得懂的人不吝赐教。

[^codeOpenSSLConfigTemplate]:
    ```ini
    #
    # OpenSSL example configuration file.
    # See doc/man5/config.pod for more info.
    #
    # This is mostly being used for generation of certificate requests,
    # but may be used for auto loading of providers

    # Note that you can include other files from the main configuration
    # file using the .include directive.
    #.include filename

    # This definition stops the following lines choking if HOME isn't
    # defined.
    HOME            = .

    # Use this in order to automatically load providers.
    openssl_conf = openssl_init

    # Comment this out if you deliberately want to ignore
    # configuration errors
    config_diagnostics = 1

    # Extra OBJECT IDENTIFIER info:
    # oid_file       = $ENV::HOME/.oid
    oid_section = new_oids

    # To use this configuration file with the "-extfile" option of the
    # "openssl x509" utility, name here the section containing the
    # X.509v3 extensions to use:
    # extensions        =
    # (Alternatively, use a configuration file that has only
    # X.509v3 extensions in its main [= default] section.)

    [ new_oids ]
    # We can add new OIDs in here for use by 'ca', 'req' and 'ts'.
    # Add a simple OID like this:
    # testoid1=1.2.3.4
    # Or use config file substitution like this:
    # testoid2=${testoid1}.5.6

    # Policies used by the TSA examples.
    tsa_policy1 = 1.2.3.4.1
    tsa_policy2 = 1.2.3.4.5.6
    tsa_policy3 = 1.2.3.4.5.7

    # For FIPS
    # Optionally include a file that is generated by the OpenSSL fipsinstall
    # application. This file contains configuration data required by the OpenSSL
    # fips provider. It contains a named section e.g. [fips_sect] which is
    # referenced from the [provider_sect] below.
    # Refer to the OpenSSL security policy for more information.
    # .include fipsmodule.cnf

    [openssl_init]
    providers = provider_sect

    # List of providers to load
    [provider_sect]
    default = default_sect
    # The fips section name should match the section name inside the
    # included fipsmodule.cnf.
    # fips = fips_sect

    [default_sect]
    # activate = 1

    ####################################################################
    [ ca ]
    default_ca  = CA_default        # The default ca section

    ####################################################################
    [ CA_default ]

    dir     = ./demoCA      # Where everything is kept
    certs       = $dir/certs        # Where the issued certs are kept
    crl_dir     = $dir/crl      # Where the issued crl are kept
    database    = $dir/index.txt    # database index file.
    #unique_subject = no            # Set to 'no' to allow creation of
                        # several certs with same subject.
    new_certs_dir   = $dir/newcerts     # default place for new certs.

    certificate = $dir/cacert.pem   # The CA certificate
    serial      = $dir/serial       # The current serial number
    crlnumber   = $dir/crlnumber    # the current crl number
                        # must be commented out to leave a V1 CRL
    crl     = $dir/crl.pem      # The current CRL
    private_key = $dir/private/cakey.pem# The private key

    x509_extensions = usr_cert      # The extensions to add to the cert

    # Comment out the following two lines for the "traditional"
    # (and highly broken) format.
    name_opt    = ca_default        # Subject Name options
    cert_opt    = ca_default        # Certificate field options

    # Extension copying option: use with caution.
    # copy_extensions = copy

    # Extensions to add to a CRL. Note: Netscape communicator chokes on V2 CRLs
    # so this is commented out by default to leave a V1 CRL.
    # crlnumber must also be commented out to leave a V1 CRL.
    # crl_extensions    = crl_ext

    default_days    = 365           # how long to certify for
    default_crl_days= 30            # how long before next CRL
    default_md  = default       # use public key default MD
    preserve    = no            # keep passed DN ordering

    # A few difference way of specifying how similar the request should look
    # For type CA, the listed attributes must be the same, and the optional
    # and supplied fields are just that :-)
    policy      = policy_match

    # For the CA policy
    [ policy_match ]
    countryName     = match
    stateOrProvinceName = match
    organizationName    = match
    organizationalUnitName  = optional
    commonName      = supplied
    emailAddress        = optional

    # For the 'anything' policy
    # At this point in time, you must list all acceptable 'object'
    # types.
    [ policy_anything ]
    countryName     = optional
    stateOrProvinceName = optional
    localityName        = optional
    organizationName    = optional
    organizationalUnitName  = optional
    commonName      = supplied
    emailAddress        = optional

    ####################################################################
    [ req ]
    default_bits        = 2048
    default_keyfile     = privkey.pem
    distinguished_name  = req_distinguished_name
    attributes      = req_attributes
    x509_extensions = v3_ca # The extensions to add to the self signed cert

    # Passwords for private keys if not present they will be prompted for
    # input_password = secret
    # output_password = secret

    # This sets a mask for permitted string types. There are several options.
    # default: PrintableString, T61String, BMPString.
    # pkix   : PrintableString, BMPString (PKIX recommendation before 2004)
    # utf8only: only UTF8Strings (PKIX recommendation after 2004).
    # nombstr : PrintableString, T61String (no BMPStrings or UTF8Strings).
    # MASK:XXXX a literal mask value.
    # WARNING: ancient versions of Netscape crash on BMPStrings or UTF8Strings.
    string_mask = utf8only

    # req_extensions = v3_req` # The extensions to add to a certificate request

    [ req_distinguished_name ]
    countryName         = Country Name (2 letter code)
    countryName_default     = AU
    countryName_min         = 2
    countryName_max         = 2

    stateOrProvinceName     = State or Province Name (full name)
    stateOrProvinceName_default = Some-State

    localityName            = Locality Name (eg, city)

    0.organizationName      = Organization Name (eg, company)
    0.organizationName_default  = Internet Widgits Pty Ltd

    # we can do this but it is not needed normally :-)
    #1.organizationName     = Second Organization Name (eg, company)
    #1.organizationName_default = World Wide Web Pty Ltd

    organizationalUnitName      = Organizational Unit Name (eg, section)
    #organizationalUnitName_default =

    commonName          = Common Name (e.g. server FQDN or YOUR name)
    commonName_max          = 64

    emailAddress            = Email Address
    emailAddress_max        = 64

    # SET-ex3           = SET extension number 3

    [ req_attributes ]
    challengePassword       = A challenge password
    challengePassword_min       = 4
    challengePassword_max       = 20

    unstructuredName        = An optional company name

    [ usr_cert ]

    # These extensions are added when 'ca' signs a request.

    # This goes against PKIX guidelines but some CAs do it and some software
    # requires this to avoid interpreting an end user certificate as a CA.

    basicConstraints=CA:FALSE

    # This is typical in keyUsage for a client certificate.
    # keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    # PKIX recommendations harmless if included in all certificates.
    subjectKeyIdentifier=hash
    authorityKeyIdentifier=keyid,issuer

    # This stuff is for subjectAltName and issuerAltname.
    # Import the email address.
    # subjectAltName=email:copy
    # An alternative to produce certificates that aren't
    # deprecated according to PKIX.
    # subjectAltName=email:move

    # Copy subject details
    # issuerAltName=issuer:copy

    # This is required for TSA certificates.
    # extendedKeyUsage = critical,timeStamping

    [ v3_req ]

    # Extensions to add to a certificate request

    basicConstraints = CA:FALSE
    keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    [ v3_ca ]

    # Extensions for a typical CA

    # PKIX recommendation.

    subjectKeyIdentifier=hash

    authorityKeyIdentifier=keyid:always,issuer

    basicConstraints = critical,CA:true

    # Key usage: this is typical for a CA certificate. However since it will
    # prevent it being used as an test self-signed certificate it is best
    # left out by default.
    # keyUsage = cRLSign, keyCertSign

    # Include email address in subject alt name: another PKIX recommendation
    # subjectAltName=email:copy
    # Copy issuer details
    # issuerAltName=issuer:copy

    # DER hex encoding of an extension: beware experts only!
    # obj=DER:02:03
    # Where 'obj' is a standard or added object
    # You can even override a supported extension:
    # basicConstraints= critical, DER:30:03:01:01:FF

    [ crl_ext ]

    # CRL extensions.
    # Only issuerAltName and authorityKeyIdentifier make any sense in a CRL.

    # issuerAltName=issuer:copy
    authorityKeyIdentifier=keyid:always

    [ proxy_cert_ext ]
    # These extensions should be added when creating a proxy certificate

    # This goes against PKIX guidelines but some CAs do it and some software
    # requires this to avoid interpreting an end user certificate as a CA.

    basicConstraints=CA:FALSE

    # This is typical in keyUsage for a client certificate.
    # keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    # PKIX recommendations harmless if included in all certificates.
    subjectKeyIdentifier=hash
    authorityKeyIdentifier=keyid,issuer

    # This stuff is for subjectAltName and issuerAltname.
    # Import the email address.
    # subjectAltName=email:copy
    # An alternative to produce certificates that aren't
    # deprecated according to PKIX.
    # subjectAltName=email:move

    # Copy subject details
    # issuerAltName=issuer:copy

    # This really needs to be in place for it to be a proxy certificate.
    proxyCertInfo=critical,language:id-ppl-anyLanguage,pathlen:3,policy:foo

    ####################################################################
    [ tsa ]

    default_tsa = tsa_config1   # the default TSA section

    [ tsa_config1 ]

    # These are used by the TSA reply generation only.
    dir     = ./demoCA      # TSA root directory
    serial      = $dir/tsaserial    # The current serial number (mandatory)
    crypto_device   = builtin       # OpenSSL engine to use for signing
    signer_cert = $dir/tsacert.pem  # The TSA signing certificate
                        # (optional)
    certs       = $dir/cacert.pem   # Certificate chain to include in reply
                        # (optional)
    signer_key  = $dir/private/tsakey.pem # The TSA private key (optional)
    signer_digest  = sha256         # Signing digest to use. (Optional)
    default_policy  = tsa_policy1       # Policy if request did not specify it
                        # (optional)
    other_policies  = tsa_policy2, tsa_policy3  # acceptable policies (optional)
    digests     = sha1, sha256, sha384, sha512  # Acceptable message digests (mandatory)
    accuracy    = secs:1, millisecs:500, microsecs:100  # (optional)
    clock_precision_digits  = 0 # number of digits after dot. (optional)
    ordering        = yes   # Is ordering defined for timestamps?
                    # (optional, default: no)
    tsa_name        = yes   # Must the TSA name be included in the reply?
                    # (optional, default: no)
    ess_cert_id_chain   = no    # Must the ESS cert id chain be included?
                    # (optional, default: no)
    ess_cert_id_alg     = sha1  # algorithm to compute certificate
                    # identifier (optional, default: sha1)

    [insta] # CMP using Insta Demo CA
    # Message transfer
    server = pki.certificate.fi:8700
    # proxy = # set this as far as needed, e.g., http://192.168.1.1:8080
    # tls_use = 0
    path = pkix/

    # Server authentication
    recipient = "/C=FI/O=Insta Demo/CN=Insta Demo CA" # or set srvcert or issuer
    ignore_keyusage = 1 # potentially needed quirk
    unprotected_errors = 1 # potentially needed quirk
    extracertsout = insta.extracerts.pem

    # Client authentication
    ref = 3078 # user identification
    secret = pass:insta # can be used for both client and server side

    # Generic message options
    cmd = ir # default operation, can be overridden on cmd line with, e.g., kur

    # Certificate enrollment
    subject = "/CN=openssl-cmp-test"
    newkey = insta.priv.pem
    out_trusted = insta.ca.crt
    certout = insta.cert.pem

    [pbm] # Password-based protection for Insta CA
    # Server and client authentication
    ref = $insta::ref # 3078
    secret = $insta::secret # pass:insta

    [signature] # Signature-based protection for Insta CA
    # Server authentication
    trusted = insta.ca.crt # does not include keyUsage digitalSignature

    # Client authentication
    secret = # disable PBM
    key = $insta::newkey # insta.priv.pem
    cert = $insta::certout # insta.cert.pem

    [ir]
    cmd = ir

    [cr]
    cmd = cr

    [kur]
    # Certificate update
    cmd = kur
    oldcert = $insta::certout # insta.cert.pem

    [rr]
    # Certificate revocation
    cmd = rr
    oldcert = $insta::certout # insta.cert.pem
    ```

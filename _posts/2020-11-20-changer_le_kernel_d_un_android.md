---
author: Adrien
id: 3
licence: CC-BY
title: "Changer le kernel d'un android (special Nethunter)"
categories: "InfoSec"
---

Dans cet article je vais essayer de vous montrer comment changer le kernel d'un smartphone Android ou avec une base Android. L'exemple se basera plus particulièrement sur un kernel Nethunter.

## Intro

Bon déjà il faudrait expliquer quelques trucs au préalable. Déjà, sans rentrer dans les détails, le kernel c'est le noyau d'un système d'exploitation. Pour nous, ça sera donc le noyau d'Android qui est Linux.  Le noyau c'est ce qui permet la communication entre la couche logicielle (les applications par exemple) et la couche matérielle (carte wifi, port USB...).

Quel est le but ? Dans mon cas je vais installer un kernel Nethunter, Nethunter c'est un peu le kali linux des smartphones. En fait, un smartphone android n'est, de base, pas compatible avec toutes les cartes wifi, et n'est pas compatible non plus à l'injection clavier (principe du Rubber Ducky, faire passer une clé usb USB un clavier). Et si ce n'est pas compatible c'est dû au kernel, notamment car les drivers ne sont pas installés dans le kernel. On pourrait se dire qu'il suffit donc d'installer les drivers comme on le ferait sur Linux, sauf que les smartphones sont un petit peu particuliers et ce n'est pas si facile...

Aussi, pourquoi changer uniquement le kernel et pas toute la ROM ? Plusieurs raisons de mon point de vue, ça permet plus librement de choisir n'importe quelle ROM et de changer le kernel par la suite, dans mon cas je souhaitais garder /e/os. On est potentiellement aussi moins dépendants des versions de la ROM. Et enfin si notre téléphone est déjà root, on ne perd pas nos données.

### Disclaimers

1. Changer le kernel peut être dangereux, vous pourriez perdre vos données ! Faites des sauvegardes.

2. Je n'ai pas vérifié, mais je suis presque sûr que faire ça fait sauter la garantie de votre téléphone, si vous y tenez c'est peut être à éviter.

3. Je vais utiliser Nethunter, cependant je n'incite personne à hacker qui que ce soit ou quoi que ce soit sans permission.

En bref, je ne pourrai en aucun cas être tenu responsable de ce que vous ferrez avec ce "tuto".

### Prérequis

- Un minimum de connaissance pourrait être pas mal, bien que je vais essayer de simplifier et que tout sera au maximum guidé, comprendre ce que l'on fait est toujours mieux.

- Un téléphone "ouvert" **avec les droits root**, j'utiliserai personnellement un Google Nexus 5x déjà root il y a quelque temps. Ce tuto devrait fonctionner avec la plupart des marques de téléphone (Samsung, Fairphone, Google, Motorola...), mais certaines marques comme Huawei peuvent nous empêcher de nous amuser...

- Un kernel compatible avec le téléphone, je donnerai plus bas un lien pour des kernels Nethunter, mais si vous ne voulez pas Nethunter ou si votre téléphone n'est pas dans la liste il faudra soit chercher, soit build vous-même le kernel (bonne chance xD). 

- Je ferai personnellement tout ça sur Linux, mais il est peut-être possible de le faire sur Windows, donc si vous tenez à le faire sur Windows il faudra faire quelques recherches supplémentaires de votre côté.

- J'utiliserai ADB et Fastboot afin de faire "communiquer" mon ordinateur et mon téléphone.

- Pour la modification du kernel j'utiliserai `abootimg`.

- Et du temps ^^

## Récupérer la partition boot

Bon... Enfin dans le vif du sujet ! L'intro était un peu longue, mais il me semble que c'était important.

### Installer ADB & Fastboot

Afin de pouvoir faire le changement de kernel il va nous falloir ADB et fastboot. Fastboot nous servira pour flasher le téléphone et ADB pour récupérer la partition. Il se pourrait que pour certains téléphones fastboot ne soit pas la méthode à appliquer pour flasher le téléphone, je vous invite à vous renseigner, je ne peux pas me permettre de faire un tuto exhaustif sur toutes les marques. ^^' 

Si vous êtes sur Linux il vous suffira dans la plupart des cas de les installer depuis votre gestionnaire de paquets, sinon il faudra passer par une autre manière,  je vous renvoie vers [cette page](https://developer.android.com/studio/releases/platform-tools). 

Étant sous ArchLinux, j'ai le paquet `android-tools` disponible sur les dépôts, il inclut `adb` et `fastboot`. Je n'ai donc qu'à faire `sudo pacman -S android-tools` pour les avoir.

Il faut activer ADB sur le téléphone, pour ça il faut aller dans les paramètres, puis trouver les informations du téléphone afin d'avoir le numéro de build, il faudra ensuite appuyer une dizaine de fois dessus. Une fois cela fait, ça débloquera les options de développeur, dans lesquelles on pourra activer ADB.

Une fois ADB activé sur le téléphone on peut le brancher à notre ordinateur, il faut activer le transfert des fichiers pour que tout fonctionne. Une pop-up devrait s'afficher si vous le branchez pour la première fois sur votre ordinateur pour autoriser ADB (je sais plus trop à quel moment ça apparaît, mais ça devrait pas être trop compliqué à gérer, je vous fais confiance :D).

### Trouver et télécharger la partition

Pour les étapes qui suivent il vous faut avoir les droits root sur votre téléphone, les façons pour y arriver dépendent de chaque marque, je ne peux donc pas montrer comment il faut faire, mais internet regorge d'informations à ce sujet, vous devriez trouver comment on fait !

Pour vérifier le fonctionnement d'ADB on peut faire `adb devices` dans un terminal, si tout se passe bien vous devriez voir un hash pour votre téléphone suivi du mot "device".

It's time to trouver la partition boot !! La partition boot permet, comme son nom l'indique, le démarrage et possède entre autres le kernel. Pour trouver la partition on va se connecter en mode shell au téléphone via adb, on peut faire ça via la commande `adb shell`.  On peut maintenant lancer des commandes sur le téléphone. Cette commande `ls -la /dev/block/*/by-name | grep boot` permet de trouver la partition liée a boot. Voici par exemple ce que j'obtiens :

```
lrwxrwxrwx 1 root root   21 1970-01-24 01:37 boot -> /dev/block/mmcblk0p37
```

On peut voir que le chemin de ma partition boot est `/dev/block/mmcblk0p37`.  Il faut ensuite passer en mode root,  ce que`su` nous permet de faire. Après avoir lancé la commande une pop-up devrait apparaître sur votre téléphone pour accorder les droits root au shell. Une fois root on peut  mettre la partition dans un fichier, pour cela il faut récupérer le chemin de tout à l'heure et faire `dd if=/dev/block/mmcblk0p37 of=/sdcard/boot.img`. `if=` permet de spécifier le chemin d'*input*, pensez bien à mettre le chemin de votre partition, ne mettez pas la mienne. `of=` permet de spécifier le chemin d'*output*, dans notre cas on "copie" la partition vers `/sdcard/boot.img`, ça devrait correspondre à la racine des données du téléphone, adaptez le chemin à votre téléphone et à vos goûts. **Attention, `dd` est une commande dangereuse ! Vérifier bien vos chemins `of` et `if` !** 

On peut désormais quitter le shell avec `exit`. Puis télécharger l'image de la partition sur notre ordinateur avec la commande `adb pull /sdcard/boot.img ./boot.img`, elle permet de télécharger le fichier du téléphone vers l'ordinateur. Modifiez la commande en fonction de là où vous avez mis l'image boot lors de l'étape précédente et de vos préférences.

YOUHOU ! Première grosse étape passée ! (C'est pas très long ni très dur si vous aviez déjà root votre téléphone, mais sinon c'est une sacré étape ^^)

Si vous n'aviez pas encore root votre téléphone, n'hésitez pas à prendre  une petite pause. :D

## Modifier l'image de boot

Maintenant il nous faut le nouveau kernel, pour ça, soit on trouve un kernel déjà build, soit on doit le build soi-même. Personnellement, j'ai la chance d'avoir un kernel déjà build disponible sur les internets, mais ça pourrait être intéressant de build mon propre kernel, peut être pour un prochain article. :D

Sur le [GitLab de Nethunter](https://gitlab.com/kalilinux/nethunter/build-scripts/kali-nethunter-devices/-/tree/master/) on peut avoir une liste des kernels déjà build. Pour mon Nexus 5x sous Android 8.1 je dois aller dans `/oreo/bullhead`, oreo étant le nom de la version d'Android 8 et bullhead le nom de code du Nexus 5x. Il faut ensuite télécharger le fichier `Image.gz-dtb` qui est le kernel. Voici une liste des [kernels buildables](https://kalilinux.gitlab.io/nethunter/build-scripts/kali-nethunter-devices/nethunter-kernels.html), chacun étant accompagné des ajouts au kernel comparé à une version officielle et le lien d'un repo git pour le cloner.

Maintenant qu'on a notre image boot et notre nouveau kernel il faut mettre le kernel dans l'image, pour cela je vais utiliser [`abootimg`](https://github.com/ggrandou/abootimg) comme dit plus haut. Il est disponible sur AUR donc je peux l'installer facilement, si vous n'utilisez pas Arch Linux vérifiez s'il est dans vos dépôts, sinon il vous faudra sûrement le build vous-même.

Avant de modifier l'image, je vous conseille de faire une backup au cas où, il serait chiant que votre nouvelle image ne fonctionne pas alors que vous l'avez déjà upload dans le téléphone !

Changer le kernel d'une image c'est super simple avec `abootimg`, il suffit d'une commande : `abootimg -u boot.img -k Image.gz-dtb`. Où `-u` veut dire qu'on *update* l'image, ensuite `boot.img` est simplement l'image que l'on veut modifier et enfin `-k` précise que l'on modifie le *kernel*, avec `Image.gz-dtb` le chemin du nouveau kernel.

## Flasher la nouvelle image boot

C'est la dernière étape ! Il nous reste plus qu'à flasher le nouvelle image. Pour ça on va utiliser fastboot, mais avant il nous faut aller sur le bootloader : `adb reboot bootloader`. Une fois sur le bootloader on peut vérifier si le téléphone est bien détecté par fastboot : `sudo fastboot devices`, j'ai besoin d'exécuter les commandes en tant que root, sinon mon ordinateur ne détecte pas le téléphone.

Pour flasher l'image il nous faut faire cette commande : `sudo fastboot flash boot boot.img` il y aura un chargement très court qui devrait nous dire "OKAY" si tout se passe bien. Vous pouvez ensuite reboot votre téléphone.

Eeeeeeet... TADAM !! Le kernel est changé !!

Pour vous en assurer vous pouvez aller dans les paramètres puis dans les infos de votre téléphone, dans la version du kernel vous devriez voir un nom différent, par exemple voici ce que j'ai :

![Kernel Version](/assets/images/3_1_kernel_version.webp)

`Re4son` c'est la personne qui a build mon kernel et on peut voir que c'est bien le bon kernel que j'ai du coup !

## Information additionnelle

Je souhaite juste vous prévenir sur le fait qu'une mise à jour de votre système d'exploitation va très certainement override le kernel. Ce n'est pas très grave, mais il ne faudra juste pas être surpris si certaines fonctionnalités du kernel ne fonctionnent plus après une mise à jour. Cependant c'est maintenant très simple de remettre à jour votre kernel, il suffit simplement de refaire la dernière étape de cet article ! :D

## Conclusion

Voilà, c'est fini ! Vous savez maintenant comment changer le kernel de votre Android ~~facilement~~. Si vous avez des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur discord : `{{ site.data.globals.discordtag }}`

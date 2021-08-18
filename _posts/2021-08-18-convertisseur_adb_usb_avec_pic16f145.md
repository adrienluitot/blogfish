---
author: Adrien
id: 6
licence: CC-BY
title: "Convertisseur ADB/USB avec un PIC16F145x - Partie 1 : HID"
categories: "Electronics"
---

Conception et réalisation d'un convertisseur ADB/USB avec un microcontroller PIC16F145x. Première partie : utiliser le microcontroller pour envoyer des caractères.

## Intro

Hey !

Y a quelques temps j'ai eu la chance de pouvoir récupérer un vieil *Apple Extended Keyboard II* de 1993 (si je comprends bien les dates moulées à l'intérieur du clavier). Pour éviter qu'il croupisse dans un meuble, je voulais le tester en pensant qu'il avait une connexion PS2. Sauf qu'à l'époque déjà, Apple avait déjà besoin de se différencier avec leurs propres systèmes pas du tout standardisés... et sur leurs périphériques des années 90 ils avaient le système ADB avant qu'il soit remplacé par le fabuleux standard USB.

Bref, tout ça pour dire que je pouvais pas l'utiliser sur mon ordi moderne, donc j'ai eu besoin d'un convertisseur ADB/USB (en réalité il sera unidirectionnel, le PC ne devrait pas avoir grand chose à envoyer au clavier, mais techniquement il pourrait). Du coup j'ai cherché sur l'internet s'il en existait, mais en fait ça a pas l'air commun les gens qui veulent brancher des vieux claviers jaunies avec un layout pourri sur des pc modernes. 😬

![Apple Extended Keyboard II](/assets/images/6_1_apple_extended_keyboard.webp)

J'ai trouvé deux convertisseurs, mais il sont faits à petite échelle donc un peu trop chers et/ou livrés de trop loin ([Japon](https://github.com/tmk/tmk_keyboard/tree/master/converter/adb_usb) 42\$ avec FDP ou [USA](https://www.drakware.com/shop/p/adb2usb) 40\$ avec FDP), autrement dit : pas compatibles avec mon portefeuille. Mais un des deux est opensource, du coup je me suis dit "Let's go, go le faire moi-même !", en pensant que ça serait simple... En réalité ça aurait pu l'être, mais le projet utilise un Atmega32u4 (ou équivalent), un microcontroller très répendu dans l'univers des claviers custom, notamment grâce à sa gestion native (hardware) de l'USB, mais aussi grâce à ses nombreux pins. Sauf que ces nombreux pins sont utiles quand on a une matrice avec des dizaines de touches, mais nous on a besoin de 1 pin pour ADB et 2 pins pour l'usb... donc l'Atmega32u4 et ses 44 pins c'est un tantinet overkill... C'est pourquoi j'ai fait quelques recherches et j'ai trouvé les microcontrollers PIC 16(L)F145x qui gèrent l'USB, qui sont un peu moins cher, mais aussi plus petits (seulement 14 pins pour les 1454 et 1455; et 20 pins pour le 1459).

Le soucis avec ces microcontrollers c'est qu'ils sont pas compatibles avec le firmware développé par TMK pour l'atmega... Du coup faut tout refaire... ce qui est à la fois un peu chiant, mais aussi giga cool ! Ça permet de faire le tour de plein de choses : mieux comprendre l'USB, faire de la prog embarquée, comprendre ADB (bon pas très utile je l'accorde... 🙄), faire de l'élec, designer un PCB... Et c'est toujours cool de se prendre la tête, sans parler de la satisfaction à la fin du projet !

![PIC16f1454](/assets/images/6_2_pic16f1454.webp)

## Appréhension du PIC

Après cette longue introduction (désolé), il est temps de rentrer dans le vif du sujet et on commence avec le microcontroller. J'ai d'abord essayé de le programmer avec un programme simple, je suis pas parti directement sur l'utilisation USB. Ensuite j'ai un peu triché, je me suis pas mal basé sur un projet par MicroChip d'un pavé numérique avec le 16F1459. J'ai aussi utilisé MCC (MPLAB Code Configurator) pour générér un projet facilement avec les configurations voulues.

D'ailleurs pour programmer et flasher la puce j'utilise MPLAB X IDE (MXI) avec un PicKit 3 (pas officiel 🙄) et le compilateur XC8. En gros le setup le plus basique possible pour programmer un PIC 8-bit. Mais c'est clairement pas la seule manière de faire, il est tout à fait possible de programmer et de flash sans la machine à gaz qu'est MXI, ou de faire que l'un des deux, par exemple coder sur un IDE basique puis compiler avec `gpasm` et flasher avec MXI. Par contre je sais pas trop comment faire pour flash sans MXI, mais il y a sans doute une manière. PS : J'ai trouvé un technique plus tard, je l'explique dans le prochain article.

Après ça j'ai réussi à avoir un code tout simple qui fait clignoter une LED, c'était pas le plus dur, mais c'est déjà une première bonne étape ! Ensuite il a fallu s'atteler à l'USB... Au début j'ai foncé les yeux fermés, mais ça a pas bien marché... Du coup je me suis mis à lire un peu les specs de l'USB 2.0, à regarder des vidéos et à lire le code du projet de MicroChip et du projet généré par MCC (qui permet de faire un projet USB). Ce qui m'a permis de comprendre un peu mieux le tout, puis j'ai finalement réussi à faire apparaître le PIC dans `dmesg` et `lsusb` ! En fait, je bloquais surtout sur le fonctionnement en mode "*interrupt*" ou en mode "*polling*", j'ai d'abord réussi à utiliser le mode polling, puis après j'ai réussi à utiliser le mode interruption, qui ne fonctionnait pas à cause du bit de configuration de l'interruption USB (`USBIE`) n'était pas activé.

La différence entre le *polling* et *interrupt* se situe dans la communication entre l'hôte et l'appareil. L'hôte va demander à l'appareil les informations à intervalle régulière, par exemple toutes les 10ms. L'appareil doit donc savoir quand l'hôte envoie une requête, pour ça on peut soit vérifier très régulièrement (c'est le *polling*) par exemple toutes les 10µs, soit utiliser des interruptions (j'explique juste après ce que ça signifie plus en détail). Les interruptions sont plus rapides et utilisent un peu moins le microcontroller car on ne fait pas de test, dès que l'hôte va faire une requête l'interruption se déclanchera.  
Bon, dans notre cas les 2 systèmes seraient aussi efficaces, on a pas vraiment besoin de la précision d'une interruption, ni d'économiniser les instructions du µController pour effectuer d'autres opérations. 

### Explication registres et interruptions

Je vais faire une petite explication pour ceux qui connaissent pas trop l'informatique embarquée. Un microcontroller possède des registres, certains de ces registres peuvent être modifiés pour configurer le microcontroller (ou lus pour récupérer des informations). La taille de ces registres dépend du microcontroller, si c'est un 8-bit (c'est le cas des 16F145x), alors les registres feront 8 bits. Pour les registres de configuration (souvent nommés `<truc>CON`, en tout cas pour les PIC), un bit correspond souvent à une information, parfois une information peut être codée sur plusieurs bits, formants un mot. S'il faut plus de 8 bits, les informations seront sur plusieurs registres.

#### Registres

![Registre PIE2](/assets/images/6_3_pie2_register.webp)

Par exemple juste au dessus on peut voir le registre PIE2, qui est un registre qui permet d'activer certaines interruptions (j'expliquerai les interruptions juste après). Le premier bit (bit de poids faible ou *Less Significant Bit [LSB]* en anglais) est à droite et n'est pas assigné (inutile en gros), le denier bit (bit de poids fort ou *Most Significant Bit [MSB]*) est à gauche est correspond à `OSFIE`. Au dessus de chaque bit on peut voir `R/W-0/0` ou `U-0`, ça nous renseigne sur ce qu'on peut en faire. C'est expliqué juste en dessous du tableau, mais le `R` (*Readable*) nous indique qu'on peut lire/récupérer la valeur de ce bit, le `W` (*Writable*) nous indique qu'on peut écrire/modifier la valeur de ce bit, le `U` (*Unimplemented*) nous indique que le bit ne sert à rien et qu'il sera lu comme un 0. Ensuite les `0/0` nous renseignent sur les valeurs par défaut de ces bits, dans notre cas ils sont par défaut à 0 en écriture et en lecture. En dessous des tableaux de registre on a plus d'info sur chaque bit, je les ai pas mis dans la capture au dessus parce que ça prend trop de place, mais en l'occurence là, chaque bit permet d'activer un interruption (IE -> *Interrupt Enable*), s'ils sont mis à 1, l'interruption est activée, et désactivée s'ils sont mis à 0. Donc si on revient sur ce que je disais tout à l'heure, il fallait que je mette le bit `USBIE` à 1, pour activer l'interruption USB. Si on part du même principe que le autres interruptions ne doivent pas être activées, le registre PIE2 devrait donc avoir la valeur `0b00000100` en binaire ou `0x04` en hexa.

Pour une liste complète des registres des PIC16F145x vous pouvez aller page 36 de ce PDF : [http://ww1.microchip.com/downloads/en/devicedoc/40001639b.pdf](http://ww1.microchip.com/downloads/en/devicedoc/40001639b.pdf)

#### Interruptions

Juste au dessus j'ai parlé d'interruptions, de façon très simple une interruption va être activée lors d'un changement d'état sur une fonction. Par exemple on peut mettre en place une interruption qui s'activera s'il y a un changement sur le pin RA4 (seulement certains pins peuvent être configurés en mode interruption). L'avantage des interruptions au niveau programmation, c'est qu'elles sont activées à n'importe quel moment, même si le programme est par exemple dans une boucle bloquante. On pourrait imaginer un bouton d'arrêt d'urgence sur une interruption. Les interruptions peuvent aussi avoir des niveaux de priorité, c'est utile dans le cas où plusieurs interruptions peuvent être activées en même temps. Si vous n'avez pas (totalement) compris mes explications vous pouvez toujours aller voir sur internet, sinon je vous recommande une vidéo de Ben Eater (un excellent vidéaste sur l'électronique/informatique/logique, qui explique très bien !) : [https://www.youtube.com/watch?v=DlEa8kd7n3Q](https://www.youtube.com/watch?v=DlEa8kd7n3Q). La vidéo va un peu plus loin que juste l'explication des interruptions, étant donné qu'elle fait partie d'une série de vidéo ayant pour but de créer un "ordinateur" à partir d'un microcontroller, mais ça ne fait pas de mal de voir plus de choses ! D'ailleurs la série est super intéressante !

PS: Entre le moment où j'ai écrit ces lignes et avancé sur l'article, il a sorti des vidéos sur l'USB. Si ça vous intéresse d'avoir une autre approche (plus pédagogue sûrement ^^) n'hésitez pas à aller voir !

## Configuration du PIC pour la communication USB

### Classes USB

Revenons à nos moutons... Une fois mon bit correctement activé, j'ai réussi à connecter le PIC en USB à mon PC en mode *interrupt* ! 🥳 Sauf que le truc c'est qu'en réalité jusque là j'avais presque rien programmé, si ce n'est allumer une LED une fois la connexion USB établie... Et j'avais pas tout à fait ce que je voulais, le PC détectait bien un périphérique, mais pas avec la "classe" que je souhaitais. La classe d'un périphérique USB définit sa fonction de base, le type d'appareil que c'est. Le code généré par MCC configure le PIC pour être un périphérique de classe CDC (*Communication Device Class*), j'avoue que j'ai pas trop compris à quoi ça correspond, mais c'est pas ce que je veux.

En l'occurrence, mon but c'est de simuler un clavier, il faut donc que j'utilise la classe HID (*Human Interface Device*) qui permet, en gros, à l'utilisateur d'envoyer des informations à l'ordinateur. C'est la classe utilisée pour les claviers, les souris, les tablettes graphiques, les manettes... Il y a une liste complète (mais peu détaillée) des classes sur le [site officiel](https://www.usb.org/defined-class-codes). Pour avoir plus de détails sur ces classes il faut aller dans les specs de la classe en question.

Certaines classes peuvent avoir des sous-classes donnant un peu plus de détails, par exemple dans le cas des appareils HID, il peut y avoir une sous-classe pour indiquer que l'appareil est compatible avec les BIOS.

Il fallait donc changer la configuration du PIC pour passer de CDC à HID, mon premier réflexe a été de regarder sur MCC, pour réaliser que ça ne propose du code que pour du CDC... Donc j'ai regardé comment était fait le projet du pavé numérique de MicroChip et ça m'a beaucoup aidé ! Notamment pour récupérer les fonctions pour le HID. D'ailleurs je ferai sans doute un repo GitHub plus tard, avec un projet propre pour servir de base pour un projet HID avec les PIC16F145x.

### Configuration des descripteurs

Je vais pas trop rentrer dans les détails (PS: en fait si un peu 🙄) parce que c'est pas super simple et c'est possible que ce que je dise soit pas tout à fait correct voire faux, mais c'est plus à but illustratif et explicatif et ça me permet de (re)voir le tout. Si vous voulez les détails le mieux c'est de lire la [spec de l'USB 2.0](https://www.usb.org/document-library/usb-20-specification) (have fun xD).

Pour configurer les périphériques, on utilise des descripteurs ou *descriptors* en anglais. Un *device descriptor* peut avoir plusieurs configurations, chaque configuration a une ou plusieurs interfaces, et chaque interface a un ou plusieurs *endpoints*.

![Schéma Descripteur](/assets/images/6_4_descriptor_chart.webp)

Chaque descripteur revient à un tableau de bytes, les valeurs à indiquer sont détaillées dans les documents techniques donnés par l'USB-IF (*Implementers Forum*, en gros les personnes qui gèrent l'USB), un des PDF qui nous intéressent est celui-ci : [https://www.usb.org/sites/default/files/hid1_11.pdf](https://www.usb.org/sites/default/files/hid1_11.pdf). Dedans y a à peu près tout ce qu'on veut pour configurer notre périphérique en HID, faut juste avoir la foi de lire... xD Les informations plus générales par exemple pour le *device descriptor* sont sur les spécifications de l'USB 2.0, mais page 76 (ou 66 du document) du PDF `hid1_11` y a des exemples concrets pour les *descriptors*, mais les éléments sont pas autant détaillés que sur la spec.

Je vais vous montrer mes *descriptors* et les valeurs que j'ai en expliquant ce que j'ai compris, mais c'est sujet aux changements. Si ça vous intéresse pas ou vous soule, n'hésitez pas à sauter cette partie. En pensant que je me suis grandement basé sur le code de MCC et des exemples des specs.

PS: Je me rends compte que ça doit être super chiant à lire, au final c'est une espèce de traduction moins détaillée de la spec. Si vous avez la foi et/ou que vous pigez pas l'anglais ça peut-être intéressant à lire, sinon n'hésitez pas à sauter directement à la partie "Code de test". Et si vous voulez les détails, ils sont dans l'ordre dans les specs officielles. Mais s'il y avait un descripteur à lire, je pense que ça serait le *report descriptor* (le dernier).

#### Device Descriptor

Page 76 du PDF HID (21 du document) et page 262 de la spec, on a les infos pour le *Device Descriptor* :

![Tableau Donnéss Device Descriptor](/assets/images/6_5_device_descriptor_table.webp)

Le tableau se lit comme ainsi (par colonne) : 

1. Le nom de l'item avec une lettre minuscule devant, définissant le type et la longueur de l'item `b` pour byte/8 bits, `w` pour word/16 bits, `id` 16 bits, `i` pour index/8 bits et `bcd` pour la "norme" de versionning qui est sur 16 bits

2. La position de l'item dans le "tableau" et sa taille (dans la spec, il n'y a que la taille, il n'y a pas la position)

3. Une rapide description.

4. Et sur le document pour le HID il y a des exemples de valeur.

```c
const USB_DEVICE_DESCRIPTOR device_dsc=
{
    0x12,    // Size of this descriptor in bytes
    0x01,    // DEVICE descriptor type
    0x0200,  // USB Spec Release Number in BCD format
    0x00,    // Class Code
    0x00,    // Subclass code
    0x00,    // Protocol code
    0x08,    // Max packet size for EP0
    0x04D8,  // Vendor ID 
    0x000a,  // Product ID
    0x0100,  // Device release number in BCD format
    0x1,    // Manufacturer string index
    0x2,    // Product string index
    0x0,    // Device serial number string index
    0x01     // Number of possible configurations
};
```

Chaque descripteur commence avec un octet pour indiquer sa taille en byte, suivit d'un byte pour son type (un chiffre qui permet de l'identifier). Dans le cas du *device descriptor* il fait 18 bytes (`0x12` en hexa) et a le type `0x01`, comme juste au dessus.

Ensuite on a la version de la spécification USB, j'ai mis 2.00, mais la version 1.00 fonctionnerait aussi bien vu que le PIC ne peut de toute façon gérer que du Low Speed (1.5Mb/s) ou du Full Speed (12Mb/s). La version utilise le format BCD (*Binary Coded Decimal*), donc `0x200` ça donne 2.00, si on voulait la version 1.10 on aurait mis `0x110`.

Viennent ensuite la classe, la sous-classe et le protocole du périphérique, j'ai expliqué un peu plus tôt ce que c'est, ici on met `0x00` aux deux, ça veut dire qu'elles seront définies  dans les interfaces. Si j'ai bien compris, les mettre à 0 permet d'avoir différentes classes via différentes interfaces, ce qui peut-être pratique dans certains cas, comme par exemple un téléphone pourrait avoir *Mass Storage*, *Audio*, *HID*...

Ensuite on a la taille du *Endpoint* 0, les *endpoints* c'est un peu comme des voies de communication, le 0 est sur tous les appareils USB et permet de transmettre les informations de configuration. On peut avoir 8, 16, 32 ou 64 bytes en full speed, d'après les commentaires sur les fichiers générés par MCC, avoir plus que 8 bytes prend plus de RAM pour pas grand chose.

Après on a le *Vendor Id* et le *Product Id*, le premier est donné par l'USB-IF en échange d'un petit billet (6 000$) et le deuxième c'est le propriétaire du *Vendor Id* qui le crée. Ce que j'ai mis, c'est des valeurs donnés par MicroChip, c'est leur *Vendor Id* et le *Product Id* correspond aux tests CDC, donc rien à voir, mais c'est pas grave pour l'example. Par contre il me semble que les OS, et notamment Windows, peuvent utiliser ces PID et VID pour charger les drivers de l'appareil. Il va me falloir un PID, mais je vais pas tout de suite payer pour un *Vendor Id* 😅, MicroChip propose un formulaire pour demander un *Product Id* mais je suis pas fan de l'idée, il est très restrictif je crois, je pense plutôt me servir de [https://pid.codes](https://pid.codes).

Pour la version du *device*, ça utilise le même format que pour la version de la spec, j'ai mis 1.00, mais ça pourrait changer, on s'en moque un peu.

Ensuite on a les positions de ce que je vais appeler les "textes indicatifs" de notre appareil. Leur valeur est indiquée dans un autre descripteur : le *string descriptor*, ce descripteur est sous forme de tableau, les positions correspondent aux cases du tableau avec une chaîne de caractère pour une case. Apparemment c'est aussi possible d'avoir un tableau de bytes direct, dans mon cas j'aurais le nom du fabricant à la position `0x04`, les 4 bytes précédents étant la langue des textes si j'ai bien compris. Le nom du produit serait lui à `0x12` (18) car le nom du fabricant que j'ai mis fait 14 bytes (14 + 4 = 18). Puis on aurait le numéro de série à la position `0x1f` (31) car le nom de mon produit fait 13 bytes (4 + 14 + 13 = 31).

Enfin, on a le nombre de configurations, j'en ai juste une en l'occurrence. Si on a plusieurs configurations, l'hôte va tester chaque configuration jusqu'à ce qu'il en trouve une pour laquelle il a un driver. S'il a le driver pour aucune configuration il prendra la première configuration.

Voilà pour notre *device descriptor*, c'était que le début... 🙂

#### Configuration Descriptor

![Configuration descriptor](/assets/images/6_6_configuration_descriptor_table.webp)

C'est le tour du configuration *descriptor*, il contient assez peu d'info en fait et il est plutôt simple. Voici mon code :

```c
const uint8_t configDescriptor1[]={
    0x09,    // Size of this descriptor in bytes
    0x02,    // CONFIGURATION descriptor type
    DESC_CONFIG_WORD(0x0022), // Total length of data for this cfg
    1,      // Number of interfaces in this cfg
    1,      // Index value of this configuration
    0,      // Configuration string index
    0b10100000, // Attributes
    50,     // Max power consumption (2X mA)

    --snip--
```

Pareil qu'avant, on a la taille et le type, respectivement 9 bytes et l'id 2. Ensuite on a la taille de la config, c'est pas bien compliqué, c'est les tailles additionnées de notre *configuration descriptor* (9 bytes je rappelle) et de nos interfaces + *endpoints* + *class descriptor*, moi j'ai une interface de 9 bytes, un *class descriptor* de 9 bytes et un *endpoint* de 7 bytes ce qui nous donne un total de 34 bytes (`0x22`). La macro "`DESC_CONFIG_WORD(0x0022)`" permet de convertir un *word*  de 16bits en 2 bytes de 8 bits chacun, parce qu'on a un tableau de `uint8_t` (et pas de `uint16_t`). Et ça va juste convertir `0x0022` en `0x22, 0x00`, par contre je sais pas trop pourquoi dans ce sens, y a peut-être un encodage little endian. 

Ensuite on a le nombre d'instance : une seule dans mon cas, l'index de la configuration : ça commence toujours par la 1 j'ai l'impression, et le *configuration string index* c'est comme les "textes indicatifs" précédents. Là j'en ai pas donc je laisse 0, mais j'aurais par exemple pu mettre "Configuration par défaut, sans driver" après le nom de mon produit dans le *string descriptor* donc à l'id 3.

Les attributs c'est un peu particulier je trouve... en gros on a 8 bits, mais seuls 2 bits sont utiles... Les 5 LSB sont "réservés" (inutiles en gros) donc on les met à 0, et le MSB doit être mis à 1 "pour des raisons historiques" (yes... 😅). Donc il nous reste les bits 6 et 5 (en partant de la droite), le 6 indique si l'appareil est alimenté par une source externe (autre que l'hôte) là c'est pas le cas donc je mets à 0. Le bit 5 permet, si j'ai bien compris, de permettre à l'appareil de sortir l'hôte (l'ordi donc) de veille, ça peut être utile pour un clavier, donc je l'active.

Enfin le dernier élément c'est le courant maximal que va consommer l'appareil, mais c'est le double de la valeur qu'on met, en gros dans mon cas j'ai mis 50 donc le courant max ça sera 100 mA. Le courant maximal d'un appareil USB 2.0 c'est 500 mA, du coup je pense qu'ils ont utilisé ce système pour que ça rentre sur un seul byte (255 * 2 = 510 > 500), d'autant plus qu'on a rarement besoin d'une précision au milliampère près pour un courant max, donc c'est pas con.

#### Interface Descriptor

![Interface descriptor](/assets/images/6_7_interface_descriptor_table.webp)

L'*interface descriptor* contient 9 informations de 1 byte chacune, voici ce que j'ai fait :

```c
const uint8_t configDescriptor1[]={
    --snip--

    0x09,    // Size of this descriptor in bytes
    0x04,    // INTERFACE descriptor type
    0,       // Interface Number
    0,       // Alternate Setting Number
    1,       // Number of endpoints in this interface
    0x03,    // Class code
    0x01,    // Subclass code
    0x01,    // Protocol code
    0,       // Interface string index
```

Ce *descriptor* fait donc aussi 9 bytes et a l'id 4. La troisième valeur indique le numéro/l'id de cette interface dans le cas où on en aurait plusieurs, on commence à 0 et c'est notre première (et seule) interface donc je mets 0.

L'*Alternate Setting Number* je crois que c'est la même chose que le champs précédent, mais c'est utilisé dans le cas où on voudrait utiliser une autre interface en gardant la même configuration et les autres interfaces de la configuration. Par contre je sais pas trop si c'est l'id pour la sélectionner ou si c'est l'id de l'interface à sélectionner. Mais j'en ai pas besoin, donc je laisse à 0. 

Ensuite on a tout simplement le nombre d'*endpoints* pour cette interface sans prendre en compte l'*endpoint* 0, dans mon cas j'utilise que l'*endpoint* 1 en plus, donc j'ai mis `1`.

Le *Class Code* c'est ce qu'on avait mis à 0 dans notre *Device Descriptor* pour dire qu'on le définit plus tard, c'est fait ici et on veut un HID qui a le code `0x03`. Pour la *Subclass* on a deux choix, soit "*No subclass*" soit "*Boot Interface Subclass*", j'ai choisi le *Boot Interface Subclass* qui permet d'utiliser l'appareil dans un BIOS. Vient ensuite le *Protocol Code* qui sert dans le cas où notre appareil est compatible avec les BIOS, c'est uniquement le cas des souris et des claviers. Le code pour les claviers est `1`, pour les souris c'est `2` et pour les autres c'est `0`.

Enfin comme pour le *Configuration Descriptor*, on peut mettre une description à notre descriptor, j'en utilise pas.

#### HID Descriptor

![HID descriptor](/assets/images/6_8_hid_descriptor_table.webp)

L'*HID Descriptor* donne les infos spécifiques aux appareils HID, voici mon code :

```c
const uint8_t configDescriptor1[]={
    --snip--

    0x09,     // Size of this descriptor in bytes
    0x21,     // HID descriptor type
    DESC_CONFIG_WORD(0x0110), // HID Spec Release Number in BCD format (1.10)
    0x00,     // Country Code (0x00 for Not supported)
    0x01,     // Number of class descriptors
    0x22,     // Report descriptor type
    DESC_CONFIG_WORD(62), // Size of the report descriptor
```

Comme à chaque fois on a la taille au début et encore une fois ça fait 9 bytes, c'est marrant d'ailleurs, je sais pas s'il y a une raison ou si c'est une coïncidence. Puis l'id qui correspond au *descriptor*, donné par l'USB-IF, ici `0x21`.

On retrouve la macro `DESC_CONFIG_WORD` qu'on a vu plutôt et l'encodage BCD, ça c'est nous qui choisissons, c'est pas très important.

Après on a le *Country Code*, je crois pas que ça ait une grosse importance, mais sur la plupart des claviers j'ai vu que `0x00` était utilisé, pour ne pas bloquer je suppose. Vient ensuite le nombre de *class descriptor*, si j'ai bien compris c'est des descripteurs liés à la classe (HID), dans notre cas on en a qu'un : le *report descriptor*, je reviendrai dessus un peu plus tard.

Ensuite on a le type du *descriptor* en question, dans notre cas c'est un *report* donc `0x22`. Et sa taille, c'est quelque chose qui peut pas mal varier, mais on verra ça après, enfin dans mon cas ça fait 63 bytes, et il faut le mettre au bon format avec la macro.

#### Endpoint Descriptor

![Endpoint descriptor](/assets/images/6_9_endpoint_descriptor_table.webp)

Aller, dernier *descriptor* "classique", l'*endpoint descriptor* :

```c
const uint8_t configDescriptor1[]={
    --snip--

    0x07,    // Size of this descriptor in bytes
    0x05,    //Endpoint Descriptor type
    0x81,    //EndpointAddress
    0x03,    //Attributes
    DESC_CONFIG_WORD(0x8), //size
    0x01    //Interval (1ms)
```

Déjà, pour une fois, ce *descriptor* fait 7 bytes et pas 9 ! Puis l'id de l'*endpoint descriptor* : `0x05`.

L'*endpoint address* c'est pour dire quel endpoint est configuré et le sens, ici c'est pour l'*endpoint* 1 en *IN*. *IN* ou *OUT* c'est par rapport à l'hôte, nous il va recevoir les infos (les touches par exemple), si on voulait recevoir des infos de l'ordinateur on aurait utilisé *OUT*. Les 4 bits de poids fort, donc ici `0x80` indiquent la direction, c'est `0x80` en *IN* et `0x00` en *OUT*. Les 4 bits de poids faible, ici `0x01` c'est le numéro de l'*endpoint*. Si on avait le 2ème *endpoint* en entré on aurait donc `0x82`, pour le 4ème *endpoint* en sortie on aurait `0x04`...

Pour les attributs on utilise le mode interruption, qui est `0x03`, si on avait le mode *isochronous* on aurait pu configurer les bits de poids forts, mais ici ils sont inutiles. Vient ensuite la taille maximum des paquets en bytes, on a besoin que de 8 bytes. Je pense que c'est la taille classique pour les claviers, au dessus ça serait sûrement pas pris en compte par l'ordinateur. On peut aussi configurer les bits 12 et 11 du `word` pour spécifier le nombre d'interaction par "*microframe*", je sais pas trop à quoi ça correspond ni à quoi ça sert du coup je laisse à 0, ce qui nous laisse bien `0x08` codé sur 2 bytes.

Et finalement on a l'intervalle entre les requêtes, en fait avec l'USB c'est l'ordinateur qui demande à l'appareil s'il y a du nouveau, et il fait ces demandes par intervalle. Plus cet intervalle est petit, plus c'est réactif (en théorie). Le minimum c'est 1ms (soit 1000kHz = 1Mhz), mais on peut mettre plus.

Voilà ! On a fini avec les *descriptors* "classiques", il nous reste à voir les *string descriptors* dont j'ai parlé plus tôt et le *report* du HID, et lui... ça va être long... Enfin après on parlera de choses plus sympas ! 

#### String Descriptors

Les *string descriptors* c'est simplement des descripteurs qui stockent du texte, ce qui fait qu'ils sont plutôt faciles à utiliser. Perso j'en ai trois, et ça a l'air assez classique pour les configurations des appareils USB, mais on a vu plus haut qu'on pouvait en avoir plus pour donner des infos sur d'autres descripteurs, bien que ça soit assez inutiles. Les trois descripteurs que j'ai définissent respectivement la langue, le vendeur/fabricant de l'appareil, et le nom de l'appareil. Voici ce que j'ai niveau code :

```c
const struct{uint8_t bLength;uint8_t bDscType;uint16_t string[1];} sd000 = {
    0x04,
    0x03,
    {0x0809}
};

const struct{uint8_t bLength;uint8_t bDscType;uint16_t string[13];} sd001 = {
    0x1c,
    0x03,
    {'B','l','o','g','f','i','s','h',' ','C','o','r','p'}
};

const struct{uint8_t bLength;uint8_t bDscType;uint16_t string[13];} sd002 = {
    0x1c,
    0x03,
    {'A','D','B',' ','C','o','n','v','e','r','t','e','r'}
};
```

Chaque texte est composé comme ça : La taille sur un octet, le type de descripteur sur un octet et la chaîne de caractères sur X octets.

La langue est un peu particulière, c'est a l'air d'être basé sur le "*Windows Language Code IDentifier*" (LCID). Les 8 bits de poids faible (ici 0x09 pour l'anglais) définissent la langue, et les 8 bits de poids fort définissent la sous déclinaison (ici 0x08 pour *Great Britain* Royaume Uni). Microsoft publie les PDFs de ces codes [ici](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/70feba9f-294e-491e-b6eb-56532684c37f) si vous voulez voir les autres langues, on peut y voir que le Français de France c'est 0x040C et 0x080C pour la Belgique par exemple.

Contrairement à nos descripteurs précédents, la taille de ceux là est très variable et directement liée au texte qu'ils contiennent. Attention aussi au fait que les *strings* sont en `uint16` et non pas en `char` ou `uint8` donc la taille est "double". Par exemple pour le 3ème descripteur on a : 1 byte pour la taille + 1 byte pour l'id du descripteur + 13 caractères, donc 26 bytes; soit un total de 28 bytes qui s'écrit 0x1C en hexa.

#### Report Descriptor

Là on va rentrer dans du lourd : Le *report descriptor*... Il permet d'indiquer ce qu'on envoie dans les *reports* et comment on les envoie, c'est dans ces *reports* qu'il y a les données, comme par exemple la touche appuyée. Voici mon code :

```c
const struct {uint8_t report[62];} hid_rpt01 = {
{   
    0x05, 0x01, // USAGE_PAGE (Generic Desktop)
    0x09, 0x06, // USAGE (Keyboard)
    0xa1, 0x01, // COLLECTION (Application)

      /// Keyboard begin
      0x05, 0x07, //   USAGE_PAGE (Keyboard)
          // Modifier byte
          0x19, 0xe0, //   USAGE_MINIMUM (Keyboard LeftControl)
          0x29, 0xe7, //   USAGE_MAXIMUM (Keyboard Right GUI)
          0x15, 0x00, //   LOGICAL_MINIMUM (0)
          0x25, 0x01, //   LOGICAL_MAXIMUM (1)
          0x75, 0x01, //   REPORT_SIZE (1)
          0x95, 0x08, //   REPORT_COUNT (8)
      0x81, 0x02, //   INPUT (Data,Var,Abs) // Modifier byte

          // Reserved byte
          0x75, 0x08, //   REPORT_SIZE (8)
          0x95, 0x01, //   REPORT_COUNT (1)
      0x81, 0x01, //   INPUT (cnst) //reserved byte

          // data (keys) bytes
          0x19, 0x00, //   USAGE_MINIMUM (Reserved (no event indicated))
          0x29, 0xff, //   USAGE_MAXIMUM (Keyboard Application)
          0x15, 0x00, //   LOGICAL_MINIMUM (0)
          0x25, 0xff, //   LOGICAL_MAXIMUM (255)
          0x75, 0x08, //   REPORT_SIZE (8)
          0x95, 0x06, //   REPORT_COUNT (6)
      0x81, 0x00, //   INPUT (Data,Ary,Abs) // Key Arrays (6 bytes)
      /// Keyboard end

      /// LEDs begin
      0x05, 0x08, //   USAGE_PAGE (LEDs)
          0x19, 0x01, //   USAGE_MINIMUM (Num Lock)
          0x29, 0x05, //   USAGE_MAXIMUM (Kana)
          0x75, 0x01, //   REPORT_SIZE (1)        
          0x95, 0x05, //   REPORT_COUNT (5)
      0x91, 0x02, //   OUTPUT (Data,Var,Abs) // Led Report
          0x95, 0x01, //   REPORT_COUNT (1)
          0x75, 0x03, //   REPORT_SIZE (3)
      0x91, 0x01, //   OUTPUT (Cnst) // Padding to achieve 8bits (1byte)
      /// LEDs end

    0xc0 // End Collection
   }
};
```

En fait un *report descriptor* c'est un peu comme de l'assembleur, à chaque fois c'est une instruction et une valeur. Il y a toutes les informations (enfin en théorie) dans le PDF [hut1_22.pdf](https://www.usb.org/sites/default/files/hut1_22.pdf) et sur le PDF de base de l'HID (hid1_11.pdf) que j'ai donné plus haut. J'ai essayé d'indenter de façon a peu près logique et comme j'ai compris le truc.

Y a aussi cet article en anglais qui explique assez bien : [Who-T: Understanding HID report descriptors](http://who-t.blogspot.com/2018/12/understanding-hid-report-descriptors.html) mais je vais essayer de faire de mon mieux pour expliquer.

Déjà, petite explication du fonctionnement, dans le code vous pouvez voir qu'à chaque fois on a 2 valeurs en hexa qui se suivent (sauf pour le tout dernier mais j'y viens un peu plus bas), la première précise un élément et le deuxième nombre hexa est le paramètre ou la valeur de cet élément.

Un *report descriptor* a l'air de devoir commencer par faire un *Usage Page* pour définir de quoi on parle, dans notre cas on a un appareil générique (*Generic Desktop*), donc on a 0x05 pour l'élément *Usage Page* et 0x01 pour sa valeur, ce qui correspond à *Generic Desktop Page*. Dans cette page on doit préciser ce qu'on fait, ici un clavier donc 0x09 pour l'élément *Usage* et 0x06 pour la valeur *Keyboard*. Et puisque nous avons un *Usage* il faut aussi mettre une *Collection* 0xA1, avec 0x01 pour indiquer le type de collection, ici "*Application*" qui correspond aux claviers et souris. La collection est fermée à la fin avec 0xC0 sans valeur, je pense que c'est le seul élément qui ne prend pas de valeur. Dans un *report descriptor* on peut avoir plusieurs collections si nécessaire, notamment avec un appareil qui a plusieurs fonctions si j'ai bien compris. 

Ensuite on a de nouveau un *Usage Page* donc 0x05 pour l'élément, mais la on va préciser des informations propres aux touches du clavier donc 0x07 pour la valeur. Puis cette nouvelle *Usage Page* clavier est divisée en trois parties qui se finissent toutes par un "*Input*". En fait c'est vraiment ces parties qui seront les données envoyées et interprétées par l'ordinateur, c'est plus ou moins les touches appuyées.

Je vais arrêter de préciser les hexa pour les éléments, parce que c'est pas le plus important et que tout est précisé en commentaire à droite des combo élément/valeur. Je pense que c'est plus important de comprendre à quoi servent les éléments.

La première partie définit les modificateurs, c'est à dire les touches "*Ctrl*", "*Shift*" (ou maj), "*Alt*" et "*Super*" (aka la touche Windows). C'est assez bien fait, vu que sur un clavier on a en général le côté droit et le côté gauche pour ces touches, donc 2 côtés. Et il y a 4 touches, or 2 × 4 = 8, soit la taille d'un octet ! On a donc 1 bit par touche, valant 1 s'il est activé et 0 s'il est désactivé. Voici quelques infos en plus [ici](http://forum.flirc.tv/index.php?/topic/2209-usb-hid-codes-keys-and-modifier-keys-for-flirc_util-record_api-x-y/). Enfin bref, on commence cette partie avec un *Usage Minimum*, pour bien comprendre le *Usage Minimum* il faut comprendre que les *Usage Pages* possèdent des tableaux avec des codes, chaque code ayant une signification. Dans notre cas pour le clavier, ces codes correspondent aux touches appuyées sur le clavier. Et les *Usage Minimum / Maximum* indiquent l'intervalle des codes qui pourraient être envoyés. Comme ici on est sur les modificateurs, les touches qui vont importer, ce sont les touches des modificateurs et si on regarde sur la table du PDF hut1_22.pdf que je viens de donner, de la page 82 à 88, on voit que la valeur 0xE0 (p. 87) signifie "*Keyboard LeftControl*", ça tombe bien non ? :D

Et ce *Usage Minimum* va de paire avec l'élément *Usage Maximum* (je précise pour ceux qui suivraient pas) qui dans mon code à la valeur 0xE7 soit "*Keyboard Right GUI*" (qui correspond à la touche Super/Windows). Récapitulons : entre 0xE0 et 0xE7 on a 8 touches et on a aussi 8 modificateurs, et en regardant les codes on remarque que c'est bien nos modificateurs !  
Bon voilà les *Usage Min/Max* c'est facile à comprendre ! Après, en réalité, c'est surtout applicable pour les touches classiques (comme une lettre par exemple), parce que les modificateurs sont gérés un peu différemment, vu qu'on envoie pas le code à l'ordinateur (contrairement à une touche classique), mais plutôt "l'encodage" sur 8 bits dont j'ai parlé plutôt. C'est peut-être pas la peine de les préciser en réalité, il faudrait que je teste si ça fonctionne sans. 

Les *Logical Min/Max* ce sont les valeurs minimum et maximum que peut avoir ce qu'on envoie, on va le voir juste après, mais ici on envoie 8 éléments qui peuvent valoir 0 ou 1 (et ça forme un octet). Donc le minimum est à 0 et le maximum à 1, *logique* non ? 🙄

Vient maintenant le *Report Size* et le *Report Count*, le premier indique la taille en bits du ou des éléments qu'on envoie dans cette partie. Le deuxième indique le nombre d'éléments qu'on envoie, comme je viens de le dire on envoie 8 élément de 1 bit, ça devrait être suffisamment clair je pense.

PS : J'ai fait mes tests pour les *Usage Min/Max* et c'est bien nécessaire de les mettre. En fait chaque bit correspond à un code à partir de notre *Usage Minimum*. Par exemple le bit 0 correspondra à 0xE0 et ainsi le bit 7 correspondra à 0xE7. D'ailleurs si on met d'autres valeurs, par exemple de 0x04 à 0x0B, au lieu de mettre un modificateur ça enverra des lettres entre A et H, si on envoie `0b00000110` ça écrira "bc".

Ensuite on a un *Input*, c'est pour dire qu'on va envoyer notre partie à l'ordinateur, sa valeur est codée sur 8 bits, un peu de la même façon que nos modificateurs. Mais ici on va dire que seuls ces 3 bits (voire 2 bits) de poids faible nous intéressent.  
À la page 40 (30 du doc) du PDF "hut1_22.pdf" on voit que le premier bit indique si c'est une donnée [0] ou une constante [1], dans notre cas c'est une donnée qui va changer donc on laisse le bit à 0 (`0b00000000`).  
Le deuxième bit précise le type de la donnée, si c'est un tableau [0] ou une variable classique [1]. Si j'ai bien compris, la différence entre les deux est qu'en mode variable chaque bit correspond à un code, là où en mode tableau c'est chaque octet qui correspond à un code. Pour le cas des modificateurs, ça fait qu'en mode variable on peut avoir jusqu'à 8 codes sur un seul octet, alors qu'en mode tableau il faudrait 8 octets. On met donc ce deuxième bit à 1 ce qui nous donne : `0b00000010` soit `0x02` en hexa, c'est ce qu'on a dans le descripteur au dessus.  
Le troisième bit indique si c'est une valeur absolue [0] ou relative [1] (une valeur par rapport à une autre, c'est le cas des souris par exemple qui donnent un déplacement), mais nous on reste en absolu on laisse à 0.

[![Typewrtiter Illustration](/assets/images/6_10_typewriter_illustration.jpg)](https://www.oldbookillustrations.com/illustrations/through-flemington/){:class="image-link" style="width: 50%; margin: 0 25%;"}

Voilà, on a fini avec notre première partie, la suite devrait être assez facile à comprendre vu que c'est quasiment la même chose.

La partie qui suit, c'est juste un octet réservé, il sert à rien mais il doit être là... Ces *Logical Min/Max* ont pas vraiment besoin d'être précisés, je suppose qu'ils prennent donc ceux spécifiés dans la partie d'avant. Par contre sa taille est importante, on pourrait je suppose envoyer comme avant 8 fois 1 bit, mais c'est plus logique d'envoyer 1 seule fois un octet (8 bits). Enfin l'*Input* est tout simple, on indique juste que c'est une constante (`0b00000001`) et on a pas besoin de se prendre plus la tête. Voilà c'est déjà la fin de cette partie.

Notre dernière partie envoyée correspond aux touches pressées, elle commence comme pour les modificateurs par les *Usage Min/Max*. Ici on se prive pas, on prend tous les codes possibles, comme ça on est sûr que notre clavier sera compatible.

Pour les *Logical Min/Max* je suis pas bien sûr de la fonction, je pense que j'ai mis de 0 à 255 en pensant que c'était les valeurs pouvant être envoyées et que ça correspondait aux codes des touches. Mais dans la spec du HID, pour les détails de l'input, ils disent qu'en mode *Array* les *Logical Min/Max* indiquent le nombre d'éléments pouvant être envoyés simultanément. Donc ici ça devrait être de 0 à 6, je testerai pour voir lequel des deux c'est en pratique.  
PS: D'après mes tests c'est bien de 0 à 255 qu'il faut mettre. Du coup j'ai relu la spec et en fait c'est assez clair : « *Logical Minimum specifies the lowest index value returned by the array and Logical Maximum specifies the largest.* » On peut comprendre que c'est bien de 0 à 255 si l'*index value* c'est bien les codes (de 0x00 à 0xff).

Ensuite on a les *Report Size* et *Count* c'est le même principe que précédemment. Là on a 6 éléments de chacun 8 bits, chaque élément correspond à une touche, définie par les codes de la même table que les modificateurs.

On a enfin l'*Input* qui est quasiment comme celui des modificateurs, sauf que cette partie est envoyée comme un tableau et pas comme une variable. Ici le tableau est plus logique, on aura un octet par touche, mais on appuie rarement sur beaucoup de touches en même temps. Ici on envoie 6 tableaux (1 par octet), donc max 6 touches, si on utilisait le mode variable, pour 256 touches ça ferait 256 bits donc 32 octets à envoyer... Enfin... ça permettrait d'envoyer 256 touches en même temps, mais faut avouer que c'est pas bien utile...

Le clavier Apple n'a pas de LEDs pour indiquer les modificateurs, je peux donc sûrement virer la partie des LEDs, voire ne pas faire de *Collection* et faire direct un *Usage Page* pour clavier [`0x05, 0x07`] ce qui réduirait considérablement la taille du *report*. En tout cas le PDF indique pour une *Collection Application* : «*Data reports are usually (but not necessarily) associated with application collections (at least one report ID per application).*», mais je sais pas trop quoi en tirer... Je ferai des tests aussi pour voir !

PS : J'ai fait les test et en effet on peut enlever la partie *Usage Page* pour les LEDs, donc il faut aussi modifier la taille qu'on avait précisé (passer de 62 à 44). Par contre pour la *Collection* je pense que c'est obligatoire, tant pis.

En tout cas je vais pas décrire la partie des LEDs, vu qu'elle est inutile ici, cependant elle serait utile pour la réalisation d'un vrai clavier. En plus vous devriez avoir les clés pour comprendre cette section, il y a juste le deuxième *Ouput* constant qui envoie 3 bits, afin de former un octet avec les 5 bits envoyés précédemment.

J'ai une bonne nouvelle... On a fini avec les descripteurs !!!! 🥳

[![Writing Illustration](/assets/images/6_11_writing_illustration.jpg)](https://www.oldbookillustrations.com/illustrations/edisons-electric-pen/){:class="image-link"}

## Code de test, envoyer un caractère

Pour le moment le code entier est plutôt gros et un peu compliqué, j'ai pas eu le temps (enfin *pris* le temps) de tout analyser pour le moment, je détaillerai lors d'un prochain article après avoir analysé et simplifié le tout !

Du coup je vais pas montrer tout le code, mais seulement la partie qui envoie un caractère, si vous êtes intéressés par le code entier je ferai sans doute un repo Github lors d'un prochain article.

Mais d'abord il faut que j'explique rapidement le montage que j'ai fait. J'ai simplement mis sur une *breadboard* le microcontroller connecté via un câble USB à l'ordinateur et un bouton connecté à la broche `RC5` du µC. Le but est de faire comme un clavier, mais avec une seule touche.

Voici mon code, il est plus ou moins appelé dans une boucle infinie :

```c
if (!HIDTxHandleBusy(lastINTransmission)) {
    if(!keyPass) {
        if(RC5) { //key pressed
            hid_report_in[0] = 0x02; // modifier 
            hid_report_in[1] = 0x00; // reserved
            hid_report_in[2] = 0x04; // key 1
            hid_report_in[3] = 0x00; // key 2
            hid_report_in[4] = 0x00; // key 3
            hid_report_in[5] = 0x00; // key 4
            hid_report_in[6] = 0x00; // key 5
            hid_report_in[7] = 0x00; // key 6
            // send uppercase A

            //Send the 8 byte packet over USB to the host.
            lastINTransmission = HIDTxPacket(1, (uint8_t*) hid_report_in, 8);
            keyPass = 1;

        }
    } else {
        if (!RC5) { // Key released 
            hid_report_in[0] = 0;
            hid_report_in[1] = 0;
            hid_report_in[2] = 0;
            hid_report_in[3] = 0;
            hid_report_in[4] = 0;
            hid_report_in[5] = 0;
            hid_report_in[6] = 0;
            hid_report_in[7] = 0;

            //Send the 8 byte packet over USB to the host.
            lastINTransmission = HIDTxPacket(1, (uint8_t*) hid_report_in, 8);
            keyPass = 0;
        }
    }
}
```

*Disclaimer : Je ne suis pas un pro en développement, encore moins en C et je ne vous parle même pas de l'optimisation ! De plus ce code est surtout à but éducatif, donc encore moins optimisé. Merci de votre tolérance ! 🤟 Par contre si vous avez des améliorations n'hésitez pas à m'en parler, y a mon tag Discord à la fin de l'article.*

Ce code est englobé par une condition, elle permet de s'assurer que l'ordinateur est prêt à recevoir des données. Comme elle est dans une boucle infinie, ça teste constamment si on peut envoyer nos données.

Ensuite on teste la valeur de la variable `keyPass` (initialisée à 0 plus haut), qui permet de savoir si on a appuyé et pas encore lâché la touche (enfin le bouton).

Puis on a une autre condition qui vérifie l'état du bouton, une fois pressé on remplit un tableau. C'est le tableau des données qu'on envoie à l'ordi et qui correspond à ce qu'on a renseigné dans notre *Report Descriptor*. Et si vous regardez les commentaires (et que vous avez lu la partie sur ce descripteur) vous voyez que chaque case du tableau correspond bien aux octets de notre descripteur.

![Tableau bits modificateurs](/assets/images/6_12_modifiers_table.webp)

La première case vaut `0x02` soit `0b00000010` en binaire, et si on se réfère au tableau juste ci-dessus on voit que le bit 1 correspond à "*Left Shift*", donc la touche majuscule de gauche (pas Verr. Maj hein !).

La deuxième case du tableau correspond à notre octet réservé, donc on peut mettre ce qu'on veut ça n'a pas d'importance.

Les 6 dernières cases correspondent aux touches qu'on envoie, on peut donc appuyer jusqu'à 6 touches en même temps. Pour la première touche j'ai mis `0x04`, qui indique la lettre "a" dans le tableau des codes de l'*Usage Page* du clavier.

Donc ce tableau correspond à la lettre A (majuscule). 

Une fois ce tableau rempli avec les valeurs qu'on veut, on peut l'envoyer. La fonction `HIDTxPacket` prend trois paramètres, en premier l'*endpoint*, nous on utilise l'*endpoint* 1 comme défini dans nos descripteurs. Le deuxième paramètre c'est le tableau des données à envoyer, donc le tableau qu'on a rempli (enfin un pointeur vers ce tableau plus précisément). Et le dernier paramètre c'est la taille de la transaction, ici 8 octets.

La fonction retourne un pointeur qu'on stocke dans `lastINTransmission`, ce pointeur renvoie vers un `union`. Cet `union` donne des informations sur la transaction, notamment pour savoir si la transaction est finie, d'ailleurs vous pouvez voir que cette variable est utilisée au début de ce code justement pour vérifier si l'appareil est occupé.

Une fois les données envoyées, on passe la variable `keyPass` à 1, ça veut dire qu'on appuie sur le bouton (pour ce code uniquement, ça a rien à voir avec la transaction USB). Du coup ce qui va se passer c'est que tant qu'on ne lâche pas le bouton aucune autre transaction ne va être envoyée à l'ordinateur, sans `keyPass` on enverrait en boucle la transaction juste au dessus. Sauf qu'il doit y avoir une nouvelle transaction seulement s'il y a un changement d'état.

Ainsi, si le bouton n'est plus actif (`!RC5`)  alors qu'il était actif avant, on met toutes les cases du tableau à 0 (on pourrait réduire ces lignes de code très facilement je sais :D) . Puis on l'envoie comme précédemment à l'ordinateur, on lui indique donc un changement d'état : plus aucune touche n'est appuyée.

Je pense que ce système est fait pour permettre au système d'exploitation de gérer ça comme il veut. Par exemple s'il y a une touche envoyée et pas de changement pendant plus de 500ms il va écrire la lettre en boucle et à la fréquence qu'il veut, par exemple 1 lettre toutes les 100ms (10 lettres par seconde). Alors que si on renvoie notre transaction en boucle, en ayant mis un intervalle de rafraîchissement à 1ms, c'est comme si on appuyait sur la touche toutes les 1ms, soit 1000 fois par seconde, donc on écrirait 1000 lettres par seconde. Bref, autant dire que ça serait assez peu pratique, surtout que si on voulait envoyer juste une lettre il faudrait rester appuyé dessus moins d'une milliseconde, je sais pas pour vous, mais moi je suis pas assez rapide !

Après on pourrait bien évidemment gérer ça de notre côté, en codant notre propre système, mais ça serait plus chiant pour nous... Puis ça voudrait dire que ça change d'un clavier à l'autre, ça pourrait être perturbant... Il y sûrement encore d'autres raisons, mais elles me viennent pas en tête.

À la fin, on remet `keyPass` à 0 pour indiquer qu'on a relâché la touche et pouvoir re appuyer.

Voilà c'est fini pour ce code, il fonctionne chez moi comme prévu ! 

## Conclusion

Bref, j'pensais que le clavier avait une sortie PS2... XD

Nan plus sérieusement, on a enfin fini avec cette première partie ! Et même si les descripteurs c'est un peu chiant, ça reste super intéressant tout ce que j'ai appris avec ce début de projet, j'espère que vous avez aussi appris des trucs.

Si vous avez des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur Discord : `{{ site.data.globals.discordtag }}`

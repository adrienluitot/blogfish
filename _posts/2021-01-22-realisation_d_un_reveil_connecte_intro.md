---
author: Adrien
id: 4
licence: CC-BY
title: "Réalisation d'un réveil \"connecté\" - Intro"
categories: "Electronics"
---

Au travers de cet article et de ceux qui suivront, je vous emmène avec moi pour la création de mon réveil !

## Intro

Pour une petite mise en contexte inutile, j'ai besoin d'un réveil comme la plupart des êtres humains. Pour le moment j'utilise Alexa, mais je suis un peu anti-Amazon et anti-surveillance potentielle. Donc j'ai décidé de passer sur un vrai réveil, et pourquoi pas le faire moi-même ?!

Mais je voulais qu'il soit "connecté", par ça je veux dire qu'il soit facilement configurable via mon téléphone, il faudra donc que je puisse changer l'heure, mettre des alarmes et sélectionner la douce musique qui me réveillera. En option ça serait pas mal de pouvoir upload directement les musiques depuis mon téléphone, mais je ne sais pas si ça sera possible. Pouvoir lier mon appli de réveil à mon calendrier pourrait aussi être une feature intéressante.

Bref, au menu des articles qui suivront : réaliser une appli pour configurer mon réveil + réaliser le réveil en lui-même. Je ne sais pas encore combien d'article il y aura, on verra bien !

Dans cet article on couvrira rien de technique, on va juste faire une révision des contraintes et des technologies que je vais utiliser.

## Électronique - Contraintes & envies personnelles

Bon, comme dit juste au-dessus dans l'intro, les trois choses les plus importantes sont que : ça donne l'heure, ça réveille et que ça soit configurable depuis mon téléphone intelligent.

Il faut aussi que ça soit dans mon domaine de compétences, arrivé là on a déjà pas mal de choix :

- Acheter un réveil tout fait, mais c'est de la triche et sûrement trop cher.

- Utiliser un téléphone juste pour ça, c'est faisable en choppant un vieux tel, mais ça consomme beaucoup trop et puis c'est pas très fun.

- Utiliser un Raspberry Pi (ou autre carte du style), bon, c'est un tantinet overkill et un peu trop cher (bien que le Zéro reste très abordable).

- El famoso Arduino, c'est l'option que j'ai choisie, c'est pas cher, amplement suffisant pour cette tâche, ça consomme rien et j'en ai déjà quelques-uns chez moi !

Au début j'étais parti sur un Arduino Nano et un module Bluetooth, puis en fait j'ai trouvé des [NodeMCU](https://fr.wikipedia.org/wiki/NodeMCU) (embarquant un ESP8266) chez moi, le wifi c'est peut-être un peu moins pratique que le Bluetooth, mais au moins ça me fait économiser un peu d'argent (étudiant be like) ! 

Après quelques recherches sur des horloges à base d'Arduino, j'ai réalisé qu'il n'était pas très précis et donc qu'il me fallait un module RTC (*Real-Time Clock*) pour que ça soit correctement précis. J'en ai choisi un qui ressortait souvent et qui est pas trop cher (environ 1 €), le DS3231.

Bon maintenant il nous faut encore afficher l'heure et gérer des fichiers et du son. Pour l'affichage on a une multitude de choix aussi : des afficheurs 7 segments, des écrans LCD, des écrans e-ink/e-paper, des écrans OLED... Mais comme j'ai voulu pousser le vice de la faible consommation d'énergie encore plus loin j'ai décidé de prendre un écran e-ink malgré le prix assez élevé de ces petites bêtes ! J'ai pas encore commandé de modèle précis, mais ça sera sûrement un rectangulaire chinois de 2.13 pouces dans les alentours de 10 à 15 €.

Pour les fichiers et les sons je suis tombé sur un module très pratique et pas cher (moins de 3 €) portant le nom de [DFPlayer](https://wiki.dfrobot.com/DFPlayer_Mini_SKU_DFR0299). Il possède déjà un port pour carte SD, un ampli audio, et quelques broches pour des boutons (play/pause, son suivant/précédent, volume...).

Le souci c'est qu'on ne peut pas écrire sur la carte SD depuis l'Adruino. Dans l'absolu ce n'est pas vraiment un problème, il faudra juste penser lors de la conception de la boîte du réveil à ce que la carte SD soit rapidement/facilement accessible. Je pensais aussi utiliser la carte SD pour sauvegarder les alarmes, mais vu que ce n'est pas possible je vais devoir utiliser la mémoire de l'ESP8266. Le truc c'est que cette mémoire de ne fait que 512 bytes, ce qui me parait relativement peu pour enregistrer des alarmes, à voir avec les tests et mon parsing s'il faudra faire autrement (ajouter une eeprom extérieure ou utiliser autre chose que le DFPlayer).

Pour la partie électronique "avancée" je pense qu'on est pas mal, il faudra ajouter une LED ou deux pour pouvoir lire l'écran e-ink la nuit et quelques boutons pour stopper l'alarme, activer la lumière... Sûrement aussi un switch pour activer le wifi ou un mode veille, pour essayer de consommer le moins possible et éviter les ondes inutiles.

Ah oui aussi, il faudra peut-être réfléchir à un système de backup en cas de coupure d'électricité, mais ça ne sera peut-être pas utile, le RTC embarque une pile bouton, donc l'heure devrait être conservée. Pour les musiques ça sera sur carte SD donc pas de soucis sur la conservation, et pour les alarmes ça dépendra, mais si c'est sur l'eeprom du NodeMCU même sans électricité ça devrait être conservé, puis je ferai peut-être un système de sauvegarde des alarmes sur l'appli.

Justement l'appli... Ça serait pas mal qu'on en parle aussi, non ? 

## Software - Contraintes & envies personnelles

Pour l'appli je voulais un truc homemade aussi, de toute façon j'ai pas trop le choix je pense ! Pour la communication avec le réveil, vu que c'est un NodeMCU, ça sera par WiFi, par contre je sais pas trop s'il faut le connecter au réseau, s'il faut s'y connecter directement ou si les deux sont faisables.

Je suis sous Android (enfin */e/ OS* plus précisément), donc j'ai une pléthore de possibilités pour faire l'appli. J'hésitais principalement entre Flutter et Kotlin (ou Java). Flutter me permettrait un résultat plus rapide et assez joli, surtout que j'ai déjà fait une appli avec. En revanche Kotlin je connais très peu, mais le résultat serait aussi joli et ça me permettrait de me rapprocher un peu plus de ce qui est utilisé pour la plupart des applis Android. Savoir développer des applis avec Kotlin me permettrait de pouvoir participer à des projets open source basés sur ce langage. J'ai donc choisi Kotlin ! (Il faut avouer qu'*Alzy* m'a un peu aidé à prendre cette décision !)

L'application sera très similaire aux applis d'horloge, et ne devrait pas être trop compliquée de manière générale. Je ne sais pas encore comment je vais gérer le tout, est-ce qu'il faudra être connecté au NodeMCU pour pouvoir éditer les alarmes ou est-ce qu'il faudra les créer puis les upload ? Est-ce que j'implémenterai directement la synchronisation avec mon calendrier ? On verra ça sur le "terrain" ! Ou avant si j'ai une illumination...

Pour la liaison avec le NodeMCU je pense pas que ça soit trop compliqué, il doit de toute façon y avoir tout un tas de tutoriels sur l'internet.

## Conclusion

Voilà ! Il me semble que c'est à peu près tout pour la partie chiante qui n'intéresse personne ! Bien sûr, je ne sais pas quand arrivera la suite, ça dépendra de ma motivation, de ma gestion et de quand arrive les prochains composants ! Il me manque encore le module RTC et l'écran (mais je commencerai avec un écran LCD).

Si vous avez des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur discord : `{{ site.data.globals.discordtag }}`

Sinon, je vous dis à une prochaine pour apprendre Kotlin ensemble je suppose !

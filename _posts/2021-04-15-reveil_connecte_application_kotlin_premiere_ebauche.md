---
author: Adrien
id: 5
licence: CC-BY
title: "Réveil connecté - Application Kotlin, première ébauche"
categories: "Electronics"
---

Suite de la série d'articles sur le réveil connecté. Court article pour présentater le début de l'application android.

## Intro

Comme je l'avais dit dans le dernier article cette appli est développée pour Android avec Kotlin.  J'en avais jamais fait, du coup c'est loin d'être parfait et cet article n'est pas un cours, mais plutôt un retour d'expérience et une présentation de l'application.

## Création de l'appli

La norme pour une appli Android c'est d'utiliser Android Studio, je sais pas si on a vraiment le choix. Je pense qu'on peut tout faire avec des IDE moins adaptés, comme VScodium ou Atom, mais on perdrait les imports automatiques, les suggestions avancées et surtout le visualisateur de layout qui permet de "développer" beaucoup plus vite !

![Android Studio New Project](/assets/images/5_1_android_studio_new_project.webp)

Je suis parti d'une "*Basic Activity*", au final je crois que que j'ai quasiment tout remplacé donc c'était pas forcément très utile. D'ailleurs, je pense que pour apprendre, c'est mieux de partir d'un projet vide, ça permet de mieux appréhender les différents éléments d'Android et de Kotlin.

## Design de l'appli

Comme je fais pour la plupart de mes projets, j'ai pris un crayon et une feuille de papier et j'ai posé un design rapide de l'appli. En réalité la plupart du temps lorsque je fais ça, je finis par peu suivre le design, je ne regarde même pas ma feuille pendant le développement. Mais ça me débloque, ça me donne un fil conducteur et j'ai toujours en tête le principal.

De toute façon je me suis beaucoup basé sur l'appli *Clock* de mon téléphone, je voulais quasiment faire la même chose. Au final, surtout pour des soucis de simplicité, je suis parti sur des choses légèrement différentes, et c'est pas plus mal ! :D

D'ailleurs, en regardant ma feuille je viens de me rendre compte que j'ai oublié une feature dans ce que j'ai développé pour le moment !

[![Clock Gun Illustration](/assets/images/5_2_clock_gun_illustration.jpg)](https://www.oldbookillustrations.com/illustrations/fooling-gun/){:class="image-link" style="width: 50%; margin: 0 25%;"}

## Apprentissage

Pour mon "apprentissage" ça s'est fait en plusieurs étapes. Au début j'ai voulu "faire les choses bien", je voulais apprendre correctement, suivre un tuto complet. Et pour ça quoi de mieux qu'un [tuto officiel de Google](https://developer.android.com/courses/android-basics-kotlin/course) ? Bon... c'était bien, j'ai appris certains trucs, mais en fait je ne suis pas assez patient et j'allais trop lentement. ^^

Du coup je suis parti sur YouTube, je me demandais ce que je voulais pour mon appli, puis je le recherchais sur YouTube, donc élément par élement. J'ai d'abord commencé par le système de *tabs*, une [vidéo de Code Palace](https://www.youtube.com/watch?v=ZxK7GomWRP8) m'a beaucoup aidé. Elle m'a pas seulement pour ce système, mais aussi pour mieux comprendre le fonctionnement général de Kotlin et d'Android Studio.

J'ai également directement fait des recherches sur internet et suivi quelques blogs, j'ai pas les liens, mais je suis pas sûr que ce soit du plus grand intérêt de les partager. Il y a une pléthore de tutoriels sur internet, vous trouverez bien ce qu'il vous faut !

Bien sûr, j'ai également utilisé *el famoso* Stack Overflow qui m'a beaucoup aidé, notamment pour les différents bugs.

## Conception

Le cœur graphique de l'appli est divisé en deux parties : d'abord la liste des alarmes avec la modification et l'ajout de ces dernières, puis la configuration plus générale du réveil qui contiendra la modification de l'heure, le volume...

![Applicaiton First Page](/assets/images/5_3_alarms_list.webp){:style="width: 50%; margin: 0 25%;"}

Les couleurs seront peut-être revues notamment le cyan, mais j'aime bien le violet et c'était une couleur de base donc ça, ça restera sûrement.

Cliquer sur une alarme ouvre une popup qui permet de la modifier, je suis pas ultra satisfait de la popup pour le moment, mais ça fonctionne bien. Il manque encore une partie pour la sélection de la musique de l'alarme et un moyen pour supprimer les alarmes.

![Application Edit Pop Up](/assets/images/5_4_alarm_popup.webp){:style="width: 35%; margin: 0 32.5%;"}

Il faut que je réfléchisse à un moyen de sauvegarder tout ça, et aussi à un moyen de sélectionner les musiques et d'upload le tout sur l'ESP. Le soucis c'est que je n'ai encore rien commencé niveau hardware, mais ça ne saurait tardé ! 

Cependant j'ai déjà réfléchi au parsing et au découpage des données d'une alarme :

```
| heure  | minute |  jours |    nom    |   0x0  |  id_music |end_text|
+--------+--------+--------+--- ... ---+--------+--- ... ---+--------+
|000bbbbb|00bbbbbb|?bbbbbbb|bbb ... bbb|00000000|bbb ... bbb|00011100|
```

C'est le tableau qui explique le parsing dans l'eeprom de l'ESP, mais je garde la même structure pour le code de l'appli. Je pense que le tableau se suffit à lui-même, mais les `b` indique que ça sera un bit de donnée, les `0` et `1` définissent des bits à valeur fixée et les `?` des valeurs quelconques. L'octet `end_text` ne servira pas vraiment dans l'appli, mais sera utilisé pour séparer les alarmes dans l'eeprom. Il faudrait ajouter des octets pour d'autres settings, notamment si l'alarme est activée ou non. J'aimerais aussi faire un système pour des alarmes "one shot", qui ne serviraient qu'un seul jour, puis qui seraient supprimées ou désactivées. Ça impliquerait un système de gestion des jours de l'année. 

## Conclusion

Malgré le temps que j'ai mis pour le sortir (oups), cet article est assez court et sert uniquement de présentation. J'ai déjà fait quelques modifications sur l'appli et gribouillé quelques design, mais je garde ça pour un autre article. Le prochain sera sûrement sur la partie électronique, avant de revenir sur l'appli un peu plus tard (si possible avant 2022 xD).

En attendant, si vous avez des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur discord : `{{ site.data.globals.discordtag }}`

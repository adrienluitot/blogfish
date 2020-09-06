---
author: Adrien
id: 2
licence: CC-BY
title: 'Les Dangers Du SVG'
categories: "InfoSec"
---

Voici un article qui traite des risques des fichiers SVG sur internet. Nous verrons d'abord ce qu'est un fichier SVG, les dangers et enfin comment s'en protéger.

## Le SVG, qu'est-ce que c'est ?

Déjà SVG ça veut dire *Scalable Vector Graphics*, soit "Graphiques Vectoriels Adaptables" en français. Si on ne connait pas ce format on peut déjà un peu deviner ce qu'il fait grâce au nom. Le SVG est un format d'image vectorielle, donc qu'il n'utilise pas des pixels comme pour les formats d'images "classiques" (png, jpg...), mais des équations mathématiques (si vous voulez plus d'infos je vous renvoie vers la page [Wikipédia](https://fr.wikipedia.org/wiki/Scalable_Vector_Graphics). Les fichiers SVG sont gérés avec du XML, ainsi pour créer un carré noir en SVG on aurait par exemple :

```svg
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1 1" height="150" width="150">
   <rect y="0" x="0" height="1" width="1" style="fill:#333333" />
</svg>
```

Et ça donnerait :

<p>
  <?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1 1" height="150" width="150">
      <rect y="0" x="0" height="1" width="1" style="fill:#333333" />
  </svg>
</p>

> Super ! On a un carré gris... et maintenant ? 'Fin j'peux faire pareil avec un PNG...

Alors... Oui, mais déjà on peut faire plus que des simples carrés et surtout l'avantage du SVG c'est qu'il n'y a pas de pixel ! Donc on peut zoomer à l'infini ça ne pixelise jamais ! Et souvent pour des images simples, le SVG est plus léger que les autres formats.

Un autre avantage de ce format, c'est que vu qu'il est fait à partir de XML on peut interagir avec en JS et ainsi changer sa couleur ou sa forme par exemple. 

Cependant il est très peu utilisé pour des photos ou des images avec beaucoup de détails, car ce genre d'images ont beaucoup de variations de couleurs et de nombreuses formes très spéciales. Du coup ça ne rendrait pas bien et le SVG risque d'être plus lourd qu'un autre format plus approprié. 

Bref ceci rend le SVG très intéressant et fait qu'il est de plus en plus utilisé sur le web, notamment pour des logos et des formes simples, c'est par exemple le format que j'utilise pour l'illustration du blobfish de ce site, vous pouvez d'ailleurs essayer de l'ouvrir dans un nouvel onglet et de zoomer autant que vous pouvez l'image ne pixelisera pas.

## Dangers !

Super, on a vu ce qu'est le SVG et que c'est un format intéressant, maintenant passons aux dangers de celui ci !

J'aimerais cependant d'abord préciser que je ne parle dans ce post que d'une seule "faille", il en existe peut être d'autres sur ce format que je ne connais pas.

Alors d'où vient la "faille" du SVG ? Et bien tout simplement du fait qu'on peut mettre du JavaScript directement dans les images. Vous vous rappelez que le SVG est fait avec du XML ? Du coup on peut simplement mettre des balises `<script></script>` dans le fichier.

Qu'est-ce que ça induit ? De potentielles failles XSS. Du coup oui, en soi, le SVG n'est pas directement une faille, mais plutôt un vecteur (LOL) d'attaque. Le problème c'est qu'assez peu de gens savent qu'on peut le faire et du coup pourraient accepter l'upload et/ou l'utilisation de SVG sur leurs sites.

En réalité pour comprendre quand est-ce que ça peut poser problème, il faut d'abord connaitre les failles XSS exploitables grâce au JavaScript. Les plus communes seraient la récupération des cookies ou l'éxécution de requêtes XHR (ou ajax) depuis un autre compte.

Prenons l'exemple d'un forum, qui auraient évidemment des utilisateurs, ces utilisateurs pouvant avoir une photo de profil. Or cette photo de profil est non seulement affichée sur la page de l'utilisateur, mais également dans tous ses messages. On pourrait donc imaginer un utilisateur malveillant mettant comme photo de profil un SVG contenant un script. Ce script pourrait récupérer les cookies des utilisateurs ou même changer les informations de leur compte comme leur mot de passe, leur email...

Heureusement le SVG a besoin d'être ouvert pour que le script s'éxécute, un SVG dans une balise `<img />` n'éxécutera pas de script. Cependant le problème est toujours bien présent pour plusieurs raisons, un utilisateur pourrait ouvrir l'image dans un nouvel onglet pour la voir en plus grand par exemple, mais surtout si c'est une url en la quelle nous avons confiance il est très facile de cliquer dessus, sans parler des réducteurs d'url qui pourraient masquer le tout ! Il suffit de faire preuve d'imagination et d'un peu de social engineering.

Voici à quoi pourrait ressembler un SVG contenant un script JS :

```js
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1 1" height="150" width="150">
    <rect y="0" x="0" height="1" width="1" style="fill:#333333" />
    <script>
         alert("Get Pwned");
    </script>
</svg>
```

Pour voir ce que ça donne vous pouvez cliquer [ici](/assets/images/2_1_square_scripted.svg).

Ça afficherait simplement un pop-up avec écrit "Get Pwned", mais ça pourrait être bien plus grave. On pourrait imaginer pour notre forum un script avec une requête XHR comme ceci :

```js
let xhr = new XMLHttpRequest();
xhr.open('POST', '/account/update_account.php', true);
xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
xhr.send("email=nouvel@email.com&password=nouveauMotDePasse");
```

Ainsi toutes les personnes qui ouvriront l'images dans leur navigateur auront leur mot de passe et leur email changé, donc l'utilisateur malveillant pourra se connecter sur leur compte.

Dans ce cas rien de très grave, mais maintenant imaginez ce cas sur un autre genre de site, par exemple sur le quel votre compte pourrait contenir des informations plus importantes telles que les informations de votre carte bancaire... Le problème devient tout de suite beaucoup plus important !

## Comment s'en protéger ?

### En tant qu'utilisateur

Le plus simple pour éviter ce genre d'attaque en tant qu'utilisateur est d'utiliser une extension qui bloque l'éxécution de scripts JS comme par exemple [NoScript Security Suite](https://addons.mozilla.org/fr/firefox/addon/noscript/) ou [Disable JavaScript](https://addons.mozilla.org/fr/firefox/addon/disable-javascript/). C'est un peu hardcore car ça bloque tous les scripts, mais ça marche. Le problème c'est que la plupart des sites ont besoin de javascript pour fonctionner correctement. Peut être qu'il existe des extensions permettant de bloquer les scripts uniquement dans les SVG, mais je ne sais pas si c'est techniquement possible. Il est peut être possible de gérer par extension/format, mais il y aurait toujours un risque d'un serveur mal configuré affiche un SVG ayant une autre extension.

Il est aussi important de ne jamais ouvrir de SVG non fiables dans votre navigateur, évitez les liens étranges ou inconnus. Et si vous avez absolument besoin de les ouvrir, je vous conseille de les ouvrir dans un navigateur en navigation privée, ainsi les cookies ne seront pas présents et ne pourront pas être utilisés. Aussi, si possible utilisez un VPN ou un proxy pour changer votre ip.

### En tant que développeur

Étant donné que pour les utilisateurs la solution est assez radicale, je pense que c'est surtout aux développeurs de corriger ce problème et ceci peut être fait de plusieurs manières :

- Bloquez complètement l'envoie de fichiers SVG par l'utilisateur, c'est radical aussi et ça empêche l'utilisation d'un format de fichier tout de même assez puissant, mais c'est la solution la plus simple (c'est la solution adopté par la majorité des sites).

- Si un SVG est envoyé, supprimez les scripts à l'intérieur. C'est plus compliqué à mettre en place et de mon point de vu, potentiellement plus risqué, principalement car il faut s'assurer que la supression des scripts soit bien faite et qu'il n'y ait pas de moyen de contourner cette supression.

Quelle option chosir ? Je pense que ça dépend du site web, dans un grande majorité des cas bloquer le SVG est plus simple et n'enlevera pas grand chose au site. De toute façon la plupart des utilisateurs utilisent d'autres formats d'images plus adapatés aux photos de profil.

Par contre si votre site doit afficher des SVG envoyés par des utilisateurs pour une raison X ou Y, la deuxième solution sera, je pense, obligatoire.

## Conclusion & Remerciement

Ces dangers m'ont été montré par [MrSheepSheep](https://medium.com/@mrsheepsheep) que je souhaite remercier !

Cette faille est comme toutes les failles XSS, l'importance dépend grandement du site sur le quel la faille est possible. Une légère différence comparér aux XSS qu'on a l'habitude de voir est que l'image doit être ouverte pour que le script soit lancé, cependant peu de personnes se soucient du danger des images. 

Il pourrait exister d'autres solutions qui ne me sont pas venu en tête, si vous avez d'autres idées, des questions, des conseils, des corrections ou que vous voulez simplement discuter n'hésitez pas à me joindre sur discord : `{{ site.data.globals.discordtag }}` ou par e-mail : `adrien.luitot[at]mailo.com`

<?php
/** @var $view \Symfony\Bundle\FrameworkBundle\Templating\PhpEngine */
use Symfony\Component\HttpKernel\Controller\ControllerReference;
use Symfony\Component\Routing\Exception\MissingMandatoryParametersException;

/** @var $router \Symfony\Component\Routing\Router */
$router = $this->container->get('router');

/** @var $collection \Symfony\Component\Routing\RouteCollection */
$collection = $router->getRouteCollection();

/** @var $app \Symfony\Bundle\FrameworkBundle\Templating\GlobalVariables */

?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta property="al:ios:url" content="studysauce://studysauce.com"/>
        <meta property="al:ios:app_store_id" content="3MV67NZ3PZ"/>
        <meta property="al:ios:app_name" content="Study Sauce"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no">
        <link rel="icon" sizes="76x76"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-76x76.png'); ?>">
        <link rel="icon" sizes="120x120"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-120x120.png'); ?>">
        <link rel="icon" sizes="152x152"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-152x152.png'); ?>">
        <link rel="icon" sizes="180x180"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-180x180.png'); ?>">
        <link rel="icon" sizes="300x300"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <link rel="apple-touch-icon-precomposed"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <link rel="apple-touch-icon"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <link rel="shortcut icon" sizes="16x16 32x32 64x64"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/favicon.ico'); ?>">
        <link rel="image_src"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <meta name="description"
              content="Study Sauce teaches you the most effective study methods and provides you the tools to make the most of your study time.">
        <meta property="og:image"
              content="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <meta name="apple-mobile-web-app-capable"/>
        <meta name="mobile-web-app-capable">
        <meta name="apple-mobile-web-app-status-bar-style" content="black">
        <link rel="apple-touch-startup-image"
              href="<?php print $view['assets']->getUrl('bundles/studysauce/images/studysauce-icon-300x300.png'); ?>">
        <link rel="manifest" href="<?php print $view['assets']->getUrl('bundles/studysauce/js/manifest.json'); ?>">
        <title><?php $view['slots']->output('title', 'StudySauce') ?></title>

        <?php

        foreach ($view['assetic']->stylesheets([
            '@StudySauceBundle/Resources/public/css/jquery-ui.min.css',
            '@StudySauceBundle/Resources/public/css/normalize.css',
            '@StudySauceBundle/Resources/public/css/selectize.default.css',
            '@StudySauceBundle/Resources/public/js/datetimepicker-master/jquery.datetimepicker.css',
            '@StudySauceBundle/Resources/public/css/fonts.css',
            '@StudySauceBundle/Resources/public/css/sauce.css',
            '@StudySauceBundle/Resources/public/css/dialog.css',
        ],
            [],
            ['output' => 'bundles/studysauce/css/*.css']
        ) as $url):
            ?>
            <link type="text/css" rel="stylesheet" href="<?php echo $view->escape($url) ?>"/>
        <?php endforeach;

        $iconSets = [
            '/bundles/studysauce/images/menu_new_half.png' => [
                -97 => ['#search-'],
                98 => ['#search-'],
                79 => ['/reset'],
                -80 => ['/reset'],
                -27 => ['#pack-publish'],
                28 => ['#pack-publish'],
                -32 => ['#edit-'],
                33 => ['#edit-'],
                -34 => ['#remove-'],
                35 => ['#remove-']
            ],
            '/bundles/studysauce/images/menu_new2_half.png' => [
                -1 => ['#upload-video'],
                4 => ['#upload-video'],
                5 => ['#upload-image'],
                -2 => ['#upload-image'],
                6 => ['#upload-audio'],
                -3 => ['#upload-audio']
            ]];
        ?>
        <style>
            <?php
            foreach($iconSets as $file => $icons) {
            $existing = [];
            foreach ($icons as $i => $paths) {
                foreach($paths as $c => $p) { if(in_array($p, $existing)) { continue; } print (empty($existing) ? '' : ','); ?>

            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak),
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more) .reveal<?php $existing[] = $p; } ?><?php } ?> {
                padding-left: 30px;
                position: relative;
            }

            <?php
            $existing = [];
            foreach ($icons as $i => $paths) {
                foreach($paths as $c => $p) { if(in_array($p, $existing)) { continue; } print (empty($existing) ? '' : ','); ?>

            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak):before,
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more) .reveal:before<?php $existing[] = $p; } ?><?php } ?> {
                background: url(<?php print $file; ?>) no-repeat left -2px transparent;
                content: " ";
                display: block;
                height: 24px;
                width: 24px;
                margin-top: -12px;
                position: absolute;
                left: 2px;
                top: 50%;
            }

            <?php
                foreach ($icons as $i => $paths) {
            if ($i > 0) {
                    foreach($paths as $c => $p) { ?>
            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak):hover:before,
            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak):focus:before,
            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak):active:before,
            a[href^="<?php print $p; ?>"].active:not(.more):not(.btn):not(.cloak):before,
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more):hover .reveal:before,
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more):focus .reveal:before,
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more):active .reveal:before,
            a[href^="<?php print $p; ?>"].cloak.active:not(.btn):not(.more) .reveal:before<?php print ($c == count($paths) -1 ? '' : ','); ?>
            <?php } ?> {
                background-position: left -<?php print ($i - 1) * 50 + 2; ?>px;
            }

            <?php } else {
                    foreach($paths as $c => $p) { ?>
            a[href^="<?php print $p; ?>"]:not(.more):not(.btn):not(.cloak):before,
            a[href^="<?php print $p; ?>"].cloak:not(.btn):not(.more) .reveal:before<?php print ($c == count($paths) -1 ? '' : ','); ?>
            <?php } ?> {
                background-position: left <?php print ($i + 1) * 50 - 2; ?>px;
            }
            <?php } ?>

            <?php }
             } ?>
        </style>


        <?php $view['slots']->output('stylesheets'); ?>
    </head>
    <body class="<?php $view['slots']->output('classes') ?>">
    <?php $view['slots']->output('body') ?>
    <script type="text/javascript" src="https://www.youtube.com/iframe_api"></script>
    <script src="<?php echo $view['assets']->getUrl('bundles/fosjsrouting/js/router.js'); ?>"></script>
    <script
        src="<?php echo $view['router']->generate('fos_js_routing_js', array('callback' => 'fos.Router.setData')); ?>"></script>
    <?php foreach ($view['assetic']->javascripts(['@layout'], [], ['output' => 'bundles/studysauce/js/*.js']) as $url): ?>
        <script type="text/javascript" src="<?php echo $view->escape($url) ?>"></script>
    <?php endforeach;
    $agent = strtolower($app->getRequest()->server->get('HTTP_USER_AGENT'));
    if ((strpos($agent, 'android') && strpos($agent, 'chrome') === false) ||
        preg_match('/(?i)msie/', $agent)
    ) {
        print $this->render('StudySauceBundle:Dialogs:unsupported.html.php', ['id' => 'unsupported']);
    }
    // load the Use the App! dialog if we haven't seen it today
    if (preg_match('/(iPad|iPhone|iPod)/i', $agent)) {
        print $this->render('StudySauceBundle:Dialogs:gettheapp.html.php', ['id' => 'gettheapp']);
    }

    $view['slots']->output('javascripts');
    $view['slots']->output('sincludes');
    // show error dialogs in debug environment
    if ($app->getEnvironment() == 'dev' || $app->getEnvironment() == 'test') {
        echo $view['actions']->render(new ControllerReference('StudySauceBundle:Dialogs:deferred', ['template' => 'error']));
    }
    echo $view['actions']->render(new ControllerReference('StudySauceBundle:Dialogs:deferred', ['template' => 'contact-support']), ['strategy' => 'sinclude']);
    echo $view['actions']->render(new ControllerReference('StudySauceBundle:Dialogs:deferred', ['template' => 'general-dialog']), ['strategy' => 'sinclude']);
    echo $view->render('StudySauceBundle:Shared:footer.html.php');
    ?>
    <script>
        var _gaq = _gaq || [];
        _gaq.push(["_setAccount", "UA-72325323-1"]);
        _gaq.push(["_trackPageview"]);
        (function () {
            var ga = document.createElement("script");
            ga.type = "text/javascript";
            ga.async = true;
            ga.src = ("https:" == document.location.protocol ? "https://ssl" : "http://www") + ".google-analytics.com/ga.js";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(ga, s);
        })();
    </script>
    </body>
    </html>
<?php

$view['slots']->start('title');
$view['slots']->stop();
$view['slots']->start('stylesheets');
$view['slots']->stop();
$view['slots']->start('classes');
$view['slots']->stop();
$view['slots']->start('body');
$view['slots']->stop();
$view['slots']->start('javascripts');
$view['slots']->stop();
$view['slots']->start('sincludes');
$view['slots']->stop();


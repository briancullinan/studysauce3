<?php
use StudySauce\Bundle\Entity\User;

/** @var User $user */
$user = $app->getUser();

$view->extend('StudySauceBundle::Dialogs/dialog.html.php');

$view['slots']->start('modal-header') ?>
Send an email to have someone prepay for Study Sauce.  We will then alert you when your account has been activated.
<?php $view['slots']->stop();

$view['slots']->start('modal-body') ?>
<form action="<?php print $view['router']->generate('contact_parents'); ?>" method="post">
    <div class="first-name">
        <label class="input"><span>Parent's first name</span><input type="text" value=""></label>
    </div>
    <div class="last-name">
        <label class="input"><span>Parent's last name</span><input type="text" value=""></label>
    </div>
    <div class="email">
        <label class="input"><span>Parent's email</span><input type="email" value=""></label>
    </div>
    <?php
    if(!is_object($user) || $user->hasRole('ROLE_GUEST') || $user->hasRole('ROLE_DEMO')) { ?>
        <div class="your-first">
            <label class="input"><span>Your first name</span><input type="text" value=""></label>
        </div>
        <div class="your-last">
            <label class="input"><span>Your last name</span><input type="text" value=""></label>
        </div>
        <div class="your-email">
            <label class="input"><span>Your email</span><input type="email" value=""></label>
        </div>
    <?php } ?>
    <div class="highlighted-link invalid">
        <button type="submit" value="#submit-contact" class="more">Send</button>
    </div>
</form>
<?php $view['slots']->stop();

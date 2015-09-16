<?php

use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\GroupInvite;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

$user = $app->getUser();

$view->extend('StudySauceBundle:Shared:dashboard.html.php');

$view['slots']->start('stylesheets');
foreach ($view['assetic']->stylesheets(['@AdminBundle/Resources/public/css/import.css'],[],['output' => 'bundles/studysauce/css/*.css']) as $url): ?>
    <link type="text/css" rel="stylesheet" href="<?php echo $view->escape($url) ?>"/>
<?php endforeach;
$view['slots']->stop();

$view['slots']->start('javascripts');
foreach ($view['assetic']->javascripts(['@AdminBundle/Resources/public/js/import.js'],[],['output' => 'bundles/studysauce/js/*.js']) as $url): ?>
    <script type="text/javascript" src="<?php echo $view->escape($url) ?>"></script>
<?php endforeach;
$view['slots']->stop();

$view['slots']->start('body'); ?>
    <div class="panel-pane <?php print ($user->hasRole('ROLE_MASTER_ADVISER') || $user->hasRole('ROLE_ADMIN') ? 'master' : ''); ?>" id="import">
        <div class="pane-content">
            <h2>Invite students to Study Sauce</h2>

            <h3>1) Enter their first name, last name, and email below to invite them to Study Sauce.</h3>

            <h3>2) Your students will receive an invitation with a link that will finish setting up their account.</h3>

            <h3>3) Voila, you are connected.</h3>
            <hr/>
            <?php foreach ($app->getUser()->getGroupInvites()->toArray() as $g) {
                /** @var GroupInvite $g */
                ?>
                <div class="import-row read-only invalid">
                    <label class="input first-name">
                        <span>First name</span>
                        <input type="text" placeholder="First name" value="<?php print $g->getFirst(); ?>"/>
                    </label>
                    <label class="input last-name">
                        <span>Last name</span>
                        <input type="text" placeholder="Last name" value="<?php print $g->getLast(); ?>"/>
                    </label>
                    <label class="input email">
                        <span>Email</span>
                        <input type="text" placeholder="Email" value="<?php print $g->getEmail(); ?>"/>
                    </label>
                    <?php if($user->hasRole('ROLE_MASTER_ADVISER') || $user->hasRole('ROLE_ADMIN')) { ?>
                        <label class="input adviser">
                            <span>Adviser</span>
                            <select>
                                <option value="">Adviser</option>
                                <?php foreach($groups as $group) {
                                    /** @var Group $group */?>
                                    <option value="<?php print $group->getId(); ?>" <?php print ($g->getGroup() == $group ? 'selected="selected"' : ''); ?>><?php print $group->getName(); ?></option>
                                <?php } ?>
                            </select>
                            <input type="text" placeholder="Adviser" value="<?php print $g->getGroup()->getName(); ?>"/>
                        </label>
                        <a href="<?php print $view['router']->generate('register', ['_code' => $g->getCode()], UrlGeneratorInterface::ABSOLUTE_URL); ?>">Register</a>
                    <?php } ?>
                </div>
            <?php } ?>
            <div class="import-row edit invalid">
                <label class="input first-name">
                    <span>First name</span>
                    <input type="text" placeholder="First name"/>
                </label>
                <label class="input last-name">
                    <span>Last name</span>
                    <input type="text" placeholder="Last name"/>
                </label>
                <label class="input email">
                    <span>Email</span>
                    <input type="text" placeholder="Email"/>
                </label>
                <?php if($user->hasRole('ROLE_MASTER_ADVISER') || $user->hasRole('ROLE_ADMIN')) { ?>
                    <label class="input adviser">
                        <span>Adviser</span>
                        <select>
                            <option value="">Adviser</option>
                            <?php foreach($groups as $group) {
                                /** @var Group $group */?>
                                <option value="<?php print $group->getId(); ?>"><?php print $group->getName(); ?></option>
                            <?php } ?>
                        </select>
                    </label>
                <?php } ?>
            </div>
            <div class="highlighted-link form-actions invalid">
                <a href="#add-user" class="big-add">Add <span>+</span> user</a>
                <a href="#save-group" class="more">Import</a>
            </div>
            <hr/>
            <h2>Use our batch importer</h2>

            <h3>1) Paste your comma separated list, one invite per line.</h3>

            <h3>2) Confirm the import worked in the list above and click import above.</h3>
            <label class="import-users">
                <textarea rows="4" placeholder="first,last,email&para;first,last,email"></textarea>
            </label>
            <fieldset id="user-preview" class="read-only">
                <legend>Preview</legend>
            </fieldset>
            <div class="highlighted-link invalid">
                <a href="#import-group" class="more">Import batch</a>
            </div>
        </div>
    </div>
<?php $view['slots']->stop();

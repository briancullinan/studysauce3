<?php
use Course1\Bundle\Course1Bundle;
use Course1\Bundle\Entity\Course1;
use Course2\Bundle\Course2Bundle;
use Course2\Bundle\Entity\Course2;
use Course3\Bundle\Course3Bundle;
use Course3\Bundle\Entity\Course3;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Criteria;
use StudySauce\Bundle\Entity\Course;
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Partner;
use StudySauce\Bundle\Entity\PartnerInvite;
use StudySauce\Bundle\Entity\Schedule;
use StudySauce\Bundle\Entity\User;
use StudySauce\Bundle\Entity\Visit;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpKernel\Controller\ControllerReference;

/** @var User $user */
$user = $app->getUser();

$view->extend('StudySauceBundle:Shared:dashboard.html.php');

$view['slots']->start('stylesheets');
foreach ($view['assetic']->stylesheets(['@AdminBundle/Resources/public/css/menu.css'],[],['output' => 'bundles/admin/css/*.css']) as $url): ?>
    <link type="text/css" rel="stylesheet" href="<?php echo $view->escape($url) ?>"/>
<?php endforeach;
foreach ($view['assetic']->stylesheets(['@AdminBundle/Resources/public/css/admin.css'],[],['output' => 'bundles/admin/css/*.css']) as $url): ?>
    <link type="text/css" rel="stylesheet" href="<?php echo $view->escape($url) ?>"/>
<?php endforeach;
$view['slots']->stop();

$view['slots']->start('javascripts');
foreach ($view['assetic']->javascripts(['@AdminBundle/Resources/public/js/admin.js'],[],['output' => 'bundles/admin/js/*.js']) as $url): ?>
    <script type="text/javascript" src="<?php echo $view->escape($url) ?>"></script>
<?php endforeach; ?>
<?php $view['slots']->stop();

$view['slots']->start('body'); ?>
    <div class="panel-pane" id="command_control">
    <div class="pane-content">
    <form action="<?php print $view['router']->generate('save_group'); ?>" method="post">
    <div class="search">
        <label class="input"><input name="search" type="text" value="" placeholder="Search"/></label>
    </div>
    <div class="paginate">
        <a href="#first">&lt;&lt;</a> <a href="#prev">&lt;</a>
        <label class="input"><input name="page" type="text" value="1"/> / <span id="page-total">
                <?php print ceil($total / 25); ?>
            </span></label>
        <a href="#next">&gt;</a> <a href="#last">&gt;&gt;</a>
    </div>
    <table class="results">
    <thead>
    <tr>
        <th><label class="input">
                <span><a href="#add-user" data-toggle="modal">Add User</a></span><br/>
                <span>Visitors: <?php print $visitors; ?></span><br/>
                <input type="text" name="lastVisit" value="" placeholder="All Visits"/>
            </label>
            <div></div>
        </th>
        <th><label><span>Parents: <?php print $parents; ?></span><br/>
                <span>Partners: <?php print $partners; ?></span><br/>
                <span>Students: <?php print $students; ?></span><br/>
                <span>Advisers: <?php print $advisers; ?></span><br/>
                <select name="role">
                    <option value="">Role</option>
                    <option value="_ascending">Ascending (A-Z)</option>
                    <option value="_descending">Descending (Z-A)</option>
                    <option value="ROLE_PAID">PAID</option>
                    <option value="ROLE_ADMIN">ADMIN</option>
                    <option value="ROLE_PARENT">PARENT</option>
                    <option value="ROLE_PARTNER">PARTNER</option>
                    <option value="ROLE_ADVISER">ADVISER</option>
                    <option value="ROLE_MASTER_ADVISER">MASTER_ADVISER</option>
                    <option value="ROLE_STUDENT">STUDENT</option>
                    <option value="ROLE_GUEST">GUEST</option>
                    <option value="ROLE_DEMO">DEMO</option>
                </select></label></th>
        <th><label>
                <span><a href="#group-manager" data-toggle="modal">Manage</a></span><br/>
                <span>TAL: <?php print $torch; ?></span><br/>
                <span>CSA: <?php print $csa; ?></span><br/>
                <select name="group">
                    <option value="">Group</option>
                    <option value="_ascending">Ascending (A-Z)</option>
                    <option value="_descending">Descending (Z-A)</option>
                    <?php foreach ($groups as $i => $g) {
                        /** @var Group $g */
                        ?>
                        <option value="<?php print $g->getId(); ?>"><?php print $g->getName(); ?></option><?php
                    } ?>
                    <option value="nogroup">No Groups</option>
                </select></label></th>
        <th><label><span>Total: <?php print $total; ?></span><br/>
                <select name="last">
                    <option value="">Student</option>
                    <option value="_ascending">Ascending (A-Z)</option>
                    <option value="_descending">Descending (Z-A)</option>
                    <option value="A%">A</option>
                    <option value="B%">B</option>
                    <option value="C%">C</option>
                    <option value="D%">D</option>
                    <option value="E%">E</option>
                    <option value="F%">F</option>
                    <option value="G%">G</option>
                    <option value="H%">H</option>
                    <option value="I%">I</option>
                    <option value="J%">J</option>
                    <option value="K%">K</option>
                    <option value="L%">L</option>
                    <option value="M%">M</option>
                    <option value="N%">N</option>
                    <option value="O%">O</option>
                    <option value="P%">P</option>
                    <option value="Q%">Q</option>
                    <option value="R%">R</option>
                    <option value="S%">S</option>
                    <option value="T%">T</option>
                    <option value="U%">U</option>
                    <option value="V%">V</option>
                    <option value="W%">W</option>
                    <option value="X%">X</option>
                    <option value="Y%">Y</option>
                    <option value="Z%">Z</option>
                </select></label></th>
        <th><label><span>Finished: <?php print $completed; ?></span><br/>
                <select name="completed">
                    <option value="">Completed</option>
                    <option value="_ascending">Ascending (0-100)</option>
                    <option value="_descending">Descending (100-0)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="!1">Not 1</option>
                    <option value="!2">Not 2</option>
                    <option value="!3">Not 3</option>
                    <option value="1,2">1 &amp; 2</option>
                    <option value="1,3">1 &amp; 3</option>
                    <option value="2,3">2 &amp; 3</option>
                    <option value="!1,!2">Not 1 &amp; 2</option>
                    <option value="!1,!3">Not 1 &amp; 3</option>
                    <option value="!2,!3">Not 2 &amp; 3</option>
                    <option value="1,2,3">Completed</option>
                    <option value="!1,!2,!3">Not Completed</option>
                </select></label></th>
        <th><label class="input"><span>Sign Ups: <?php print $signups; ?></span><br/>
                <input type="text" name="created" value="" placeholder="All Sign Ups"/>
            </label>

            <div></div>
        </th>
        <th><label><span>Paid: <?php print $paid; ?></span><br/>
                <select name="hasPaid">
                    <option value="">Paid</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Goals: <?php print $goals; ?></span><br/>
                <select name="hasGoals">
                    <option value="">Goals</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Deadlines: <?php print $deadlines; ?></span><br/>
                <select name="hasDeadlines">
                    <option value="">Deadlines</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Schedules: <?php print $schedules; ?></span><br/>
                <select name="hasSchedules">
                    <option value="">Schedules</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Grades: <?php print $grades; ?></span><br/>
                <select name="hasGrades">
                    <option value="">Grades</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Partner: <?php print $partnerTotal; ?></span><br/>
                <select name="hasPartners">
                    <option value="">Partner</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span>Notes: <?php print $notes; ?></span><br/>
                <select name="hasNotes">
                    <option value="">Notes</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l1; ?></span><br/><select name="lesson1">
                    <option value="">1-1</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l2; ?></span><br/><select name="lesson2">
                    <option value="">1-2</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l3; ?></span><br/><select name="lesson3">
                    <option value="">1-3</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l4; ?></span><br/><select name="lesson4">
                    <option value="">1-4</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l5; ?></span><br/><select name="lesson5">
                    <option value="">1-5</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l6; ?></span><br/><select name="lesson6">
                    <option value="">1-6</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c1l7; ?></span><br/><select name="lesson7">
                    <option value="">1-7</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c2l1; ?></span><br/><select name="lesson8">
                    <option value="">2-1</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c2l2; ?></span><br/><select name="lesson9">
                    <option value="">2-2</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c2l3; ?></span><br/><select name="lesson10">
                    <option value="">2-3</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c2l4; ?></span><br/><select name="lesson11">
                    <option value="">2-4</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c2l5; ?></span><br/><select name="lesson12">
                    <option value="">2-5</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c3l1; ?></span><br/><select name="lesson13">
                    <option value="">3-1</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c3l2; ?></span><br/><select name="lesson14">
                    <option value="">3-2</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c3l3; ?></span><br/><select name="lesson15">
                    <option value="">3-3</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c3l4; ?></span><br/><select name="lesson16">
                    <option value="">3-4</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><?php print $c3l5; ?></span><br/><select name="lesson17">
                    <option value="">3-5</option>
                    <option value="yes">Y</option>
                    <option value="no">N</option>
                </select></label></th>
        <th><label><span><a href="#all">All</a></span><br/><span><a href="#tools">Tools</a></span><br/><span><a
                        href="#courses">Courses</a></span><br/><span>Actions</span><br/>
                <select name="actions">
                    <option value="">Select All</option>
                    <option value="delete">Delete All</option>
                    <option value="cancel">Cancel All</option>
                    <option value="email">Email All</option>
                    <option value="export">Export All</option>
                    <option value="export">Clear All</option>
                </select></label>
            <label class="checkbox"><input type="checkbox" name="select-all"/><i></i></label>
        </th>
    </tr>
    </thead>
    <tbody>
    <?php foreach ($users as $i => $u) {
        /** @var User $u */

        ?>
        <tr class="user-id-<?php print $u->getId(); ?> read-only status_<?php print ($u->getProperty(
            'adviser_status'
        ) ?: 'green'); ?>">
            <td data-timestamp="<?php print (empty($u->getLastVisit())
                ? ''
                : $u->getLastVisit()->getTimestamp()); ?>"><?php print (empty($u->getLastVisit())
                    ? 'N/A'
                    : $u->getLastVisit()->format('j M')); ?></td>
            <td>
                <label class="checkbox"><input type="checkbox" name="roles" value="ROLE_PAID" <?php print ($u->hasRole(
                        'ROLE_PAID'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>PAID</span></label>
                <label class="checkbox"><input type="checkbox" name="roles" value="ROLE_ADMIN" <?php print ($u->hasRole(
                        'ROLE_ADMIN'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>ADMIN</span></label>
                <label class="checkbox"><input type="checkbox" name="roles"
                                               value="ROLE_PARENT" <?php print ($u->hasRole(
                        'ROLE_PARENT'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>PARENT</span></label>
                <label class="checkbox"><input type="checkbox" name="roles"
                                               value="ROLE_PARTNER" <?php print ($u->hasRole(
                        'ROLE_PARTNER'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>PARTNER</span></label>
                <label class="checkbox"><input type="checkbox" name="roles"
                                               value="ROLE_ADVISER" <?php print ($u->hasRole(
                        'ROLE_ADVISER'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>ADVISER</span></label>
                <label class="checkbox"><input type="checkbox" name="roles"
                                               value="ROLE_MASTER_ADVISER" <?php print ($u->hasRole(
                        'ROLE_MASTER_ADVISER'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>MASTER_ADVISER</span></label>
                <label class="checkbox"><input type="checkbox" name="roles" value="ROLE_DEMO" <?php print ($u->hasRole(
                        'ROLE_DEMO'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>DEMO</span></label>
                <label class="checkbox"><input type="checkbox" name="roles" value="ROLE_GUEST" <?php print ($u->hasRole(
                        'ROLE_GUEST'
                    ) ? 'checked="checked"' : ''); ?> /><i></i><span>GUEST</span></label>
            </td>
            <td>
                <?php foreach ($groups as $i => $g) { ?>
                    <label class="checkbox"><input type="checkbox" name="groups"
                                                   value="<?php print $g->getId(); ?>" <?php print ($u->hasGroup(
                            $g->getName()
                        ) ? 'checked="checked"' : ''); ?> /><i></i><span><?php print $g->getName(); ?></span></label>
                <?php } ?>
            </td>
            <td>
                <label class="input"><input type="text" name="first-name" value="<?php print $u->getFirst(); ?>"
                                            placeholder="First name"/></label>
                <label class="input"><input type="text" name="last-name" value="<?php print $u->getLast(); ?>"
                                            placeholder="Last name"/></label>
                <label class="input"><input type="text" name="email" value="<?php print $u->getEmail(); ?>"
                                            placeholder="Email"/></label>
            </td>
            <td title="&lt;pre style='text-align:left; width:300px;'&gt;<?php print $view->escape(implode("\r\n", array_map(function ($i, $k) {return $k . ' = ' . print_r($i, true);}, $u->getProperties() ?: [], array_keys($u->getProperties() ?: [])))); ?>&lt;/pre&gt;"><?php print $u->getCompleted(); ?>%</td>
            <td data-timestamp="<?php print $u->getCreated()->getTimestamp(); ?>"><?php print $u->getCreated()->format(
                    'j M y'
                ); ?></td>
            <td><?php print ($u->hasRole('ROLE_PAID') ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getGoals()->count() > 0 ? 'Y' : 'N'); ?></td>
            <td><?php print $u->getDeadlines()->count(); ?></td>
            <td><?php print $u->getSchedules()->count(); ?></td>
            <td><?php print array_sum($u->getSchedules()->map(function (Schedule $s) {
                    return $s->getCourses()->filter(function (Course $c) {
                        return $c->getGrades()->count() > 0;
                    })->count();
                })->toArray()); ?></td>
            <td><?php print ($u->getPartnerInvites()->count() > 0 ? 'Y' : 'N'); ?></td>
            <td><?php print (!empty($u->getEvernoteAccessToken()) ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson1() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson2() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson3() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson4() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson5() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson6() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse1s()->count() > 0
                && $u->getCourse1s()->first()->getLesson7() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse2s()->count() > 0
                && $u->getCourse2s()->first()->getLesson1() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse2s()->count() > 0
                && $u->getCourse2s()->first()->getLesson2() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse2s()->count() > 0
                && $u->getCourse2s()->first()->getLesson3() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse2s()->count() > 0
                && $u->getCourse2s()->first()->getLesson4() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse2s()->count() > 0
                && $u->getCourse2s()->first()->getLesson5() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse3s()->count() > 0
                && $u->getCourse3s()->first()->getLesson1() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse3s()->count() > 0
                && $u->getCourse3s()->first()->getLesson2() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse3s()->count() > 0
                && $u->getCourse3s()->first()->getLesson3() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse3s()->count() > 0
                && $u->getCourse3s()->first()->getLesson4() == 4 ? 'Y' : 'N'); ?></td>
            <td><?php print ($u->getCourse3s()->count() > 0
                && $u->getCourse3s()->first()->getLesson5() == 4 ? 'Y' : 'N'); ?></td>
            <td class="highlighted-link">
                <a title="Send email" href="<?php print $view['router']->generate('emails'); ?>#<?php print $u->getEmail(); ?>"></a>
                <a title="Masquerade"
                   href="<?php print $view['router']->generate('_welcome'); ?>?_switch_user=<?php print $u->getEmail(
                   ); ?>"></a>
                <a title="Reset password" href="#confirm-password-reset" data-toggle="modal"></a>
                <a title="Cancel payment" href="#confirm-cancel-user" data-toggle="modal"></a>
                <a title="Edit" href="#edit-user"></a>
                <a title="Remove user" href="#confirm-remove-user" data-toggle="modal"></a>
                <a href="#cancel-edit">Cancel</a>
                <button type="submit" class="more" value="#save-user">Save</button>
                <label class="checkbox"><input type="checkbox" name="selected"/><i></i></label>
            </td>
        </tr>
    <?php } ?>
    </tbody>
    </table>
    </form>
    </div>
    </div>
<?php $view['slots']->stop();

$view['slots']->start('sincludes');
print $this->render('AdminBundle:Dialogs:confirm-remove-user.html.php', ['id' => 'confirm-remove-user']);
print $this->render('AdminBundle:Dialogs:confirm-password-reset.html.php', ['id' => 'confirm-password-reset']);
print $this->render('AdminBundle:Dialogs:confirm-cancel-user.html.php', ['id' => 'confirm-cancel-user']);
print $this->render('AdminBundle:Dialogs:group-manager.html.php', ['id' => 'group-manager', 'groups' => $groups]);
print $this->render('AdminBundle:Dialogs:add-user.html.php', ['id' => 'add-user']);
$view['slots']->stop();

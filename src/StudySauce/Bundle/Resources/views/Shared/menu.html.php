<?php use StudySauce\Bundle\Entity\Invite;
use StudySauce\Bundle\Entity\User;
use Symfony\Bundle\FrameworkBundle\Templating\GlobalVariables;
use Symfony\Component\HttpKernel\Controller\ControllerReference;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Role\SwitchUserRole;

/** @var GlobalVariables $app */

/** @var User $user */
$user = $app->getUser();

if(empty($user) || $user->hasRole('ROLE_GUEST')) {
    return;
}

$invites = !empty($user) ? $user->getInvites()->toArray() : [];
/** @var TokenInterface $token */
$token = $this->container->get('security.token_storage')->getToken();
if(!empty($token)) {
    foreach ($token->getRoles() as $role) {
        if ($role instanceof SwitchUserRole) {
            $parentUser = $role->getSource()->getUser();
        }
    }

    if(empty($parentUser) && $user->getParent() != $user)
    {
        $parentUser = $user->getParent();
    }

    if (!empty($parentUser)) {
        /** @var User $parentUser */
        foreach ($user->getInvitees()->toArray() as $p) {
            /** @var Invite $p */
            if ($parentUser->getUsername() == $p->getUser()->getUsername()) {
                $invites = $p->getUser()->getInvites()->toArray();
                break;
            }
        }
    }
}

?>

<aside id="right-panel" class="collapsed">
    <nav>
        <ul class="main-menu">
            <li><h3><?php print ($user->getFirst()); ?> <?php print ($user->getLast()); ?></h3><a href="#collapse">&nbsp;</a></li>
            <?php
            if (!empty($user) && $view['security']->isGranted('ROLE_PREVIOUS_ADMIN')) { ?>
                <li><a href="<?php print $view['router']->generate('_welcome'); ?>?_switch_user=_exit"><?php print (empty($p) || $p->getUser()->getId() != $p->getUser()->getId() ? 'Switch back' : implode('', [$p->getUser()->getFirst(), ' ', $p->getUser()->getLast()])); ?></a></li>
            <?php }

            foreach ($invites as $invite) {
                /** @var Invite $invite */
                if (empty($invite->getInvitee()) || $invite->getInvitee()->getId() == $user->getId()) {
                    continue;
                }
                ?>
                <li>
                    <a href="<?php print ($view['router']->generate('_welcome', ['_switch_user' => $invite->getInvitee()->getEmail()])); ?>"><?php print (implode('', [$invite->getInvitee()->getFirst(), ' ', $invite->getInvitee()->getLast()])); ?></a>
                </li>
            <?php }
             ?>
            <li><h3></h3></li>
            <li><a href="<?php print ($view['router']->generate('register_child')); ?>"><span>&nbsp;</span>Add Child</a></li>
            <?php
            if ($user->getParent()->getId() == $user->getId()) { ?>
                <li><a href="<?php print ($view['router']->generate('account')); ?>"><span>&nbsp;</span>Account settings</a></li>
            <?php } ?>
            <li><a href="<?php print ($view['router']->generate('logout')); ?>"><span>&nbsp;</span>Logout</a></li>
        </ul>
    </nav>
</aside>
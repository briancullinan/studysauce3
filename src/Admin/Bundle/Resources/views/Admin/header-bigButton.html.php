<?php

/** @var GlobalVariables $app */
use StudySauce\Bundle\Entity\User;
use StudySauce\Bundle\Entity\UserPack;
use Symfony\Bundle\FrameworkBundle\Templating\GlobalVariables;

/** @var User $user */
$request = $app->getRequest();
$user = $app->getUser();
$retention = [];
$total = 0;
foreach($results['ss_user'][0]->getUserPacks()->toArray() as $i => $up) {
    /** @var UserPack $up */
    if($up->getRemoved() || $up->getPack()->getStatus() == 'DELETED' || $up->getPack()->getStatus() == 'UNPUBLISHED') {
        continue;
    }
    foreach($up->getRetention() as $i =>  $r) {
        if($r[2]) {
            $retention[count($retention)] = $i;
            $total += 1;
        }
        if(!empty($r[3])) {
            $isNew = false;
        }
    }
    if(!empty($up->getDownloaded()) && !$up->getRemoved()) {
        $isNew = false;
    }
}
?>
<header class="<?php print ($table); ?> <?php print ($total == 0 ? 'disabled' : ''); ?>">
    <a href="<?php print ($view['router']->generate('cards', ['card' => $retention[0]])); ?>"></a>
    <label>Today&rsquo;s cards <?php print ($user->getId() != $request->get('ss_user-id') ? implode('', ['(' , $first , ' ' , $last , ')']) : ''); ?></label>
    <label><?php print ($total); ?> card<?php print ($total != 1 ? 's' : ''); ?></label>
</header>
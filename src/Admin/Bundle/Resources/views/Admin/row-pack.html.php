<?php
use StudySauce\Bundle\Entity\Card;
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Pack;
use StudySauce\Bundle\Entity\User;
use StudySauce\Bundle\Entity\UserPack;
use Symfony\Bundle\FrameworkBundle\Templating\GlobalVariables;

/** @var GlobalVariables $app */
/** @var Pack $pack */
$context = !empty($context) ? $context : jQuery($this);

$rowHtml = $view->render('AdminBundle:Admin:row.html.php', [
    'tableId' => $tableId,
    'classes' => $classes,
    'entity' => $pack,
    'table' => $table,
    'tables' => $tables,
    'request' => $request,
    'results' => $results,
    'context' => $context]);

$row = $context->filter(implode('', ['.', $table , '-id-', $pack->getId()]));

// skip rows that have zero retention
/** @var UserPack $up */
if(isset($request['user_pack-removed'])) {
    /** @var User $user */
    $user = $results['ss_user'][0];
    if (strpos($rowHtml, '<label>0</label>') !== false
        || empty($up = $user->getUserPack($pack)) || $up->getRemoved()
        || $up->getPack()->getStatus() == 'DELETED' || $up->getPack()->getStatus() == 'UNPUBLISHED'
    ) {
        return;
    }
}
$isInGroup = false;
if(isset($request['notInGroup'])) {
    /** @var User $user */
    $user = $results['ss_user'][0];
    foreach($pack->getGroups()->toArray() as $i => $g) {
        /**
         * @var Group $g
         * @var Group $g2
         */
        foreach($user->getGroups()->toArray() as $j => $g2) {
            if($g->getId() == $g2->getId()) {
                $isInGroup = true;
                break;
            }
        }
        if($isInGroup) {
            break;
        }
    }
}
if(!$isInGroup) {
    return;
}

if($row->length == 0 || !$row->is('.edit')) {
    print($rowHtml);
}

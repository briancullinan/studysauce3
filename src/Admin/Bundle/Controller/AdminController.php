<?php

namespace Admin\Bundle\Controller;

use Course1\Bundle\Entity\Course1;
use Course2\Bundle\Entity\Course2;
use Course3\Bundle\Entity\Course3;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\EntityManager;
use FOS\UserBundle\Doctrine\UserManager;
use StudySauce\Bundle\Controller\AccountController;
use StudySauce\Bundle\Controller\BuyController;
use StudySauce\Bundle\Controller\EmailsController as StudySauceEmails;
use StudySauce\Bundle\Entity\Coupon;
use StudySauce\Bundle\Entity\Course;
use StudySauce\Bundle\Entity\Deadline;
use StudySauce\Bundle\Entity\Event;
use StudySauce\Bundle\Entity\Goal;
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Schedule;
use StudySauce\Bundle\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Class PartnerController
 * @package StudySauce\Bundle\Controller
 */
class AdminController extends Controller
{
    private static $paidStr = '';

    /**
     * @param EntityManager $orm
     * @param Request $request
     * @param $joins
     * @return QueryBuilder
     */
    static function searchBuilder(EntityManager $orm, Request $request, &$joins = [])
    {
        $joins = [];
        /** @var QueryBuilder $qb */
        $qb = $orm->getRepository('StudySauceBundle:User')->createQueryBuilder('u');

        if(empty(self::$paidStr)) {
            $paidGroups = $orm->getRepository('StudySauceBundle:Group')->createQueryBuilder('g')
                ->select('g.id')
                ->andWhere('g.roles LIKE \'%s:9:"ROLE_PAID"%\'')
                ->getQuery()
                ->getArrayResult();
            self::$paidStr = implode(', ', array_map(function ($x) { return $x['id']; }, $paidGroups));
        }

        if(!empty($lastVisit = $request->get('lastLogin'))) {
            $start = new \DateTime(explode(' - ', $lastVisit)[0]);
            if(count(explode(' - ', $lastVisit)) > 1) {
                $end = new \DateTime(explode(' - ', $lastVisit)[1]);
                $qb = $qb->andWhere('u.lastVisit >= \'' . $start->format('Y-m-d 00:00:00') . '\' AND u.lastVisit <= \'' . $end->format('Y-m-d 23:59:59') . '\'');
            }
            else {
                $qb = $qb->andWhere('u.lastVisit >= \'' . $start->format('Y-m-d 00:00:00') . '\'');
            }
        }

        if(!empty($created = $request->get('created'))) {
            $start = new \DateTime(explode(' - ', $created)[0]);
            $end = new \DateTime(explode(' - ', $created)[1]);
            $qb = $qb->andWhere('u.created >= \'' . $start->format('Y-m-d 00:00:00') . '\' AND u.created <= \'' . $end->format('Y-m-d 23:59:59') . '\'');
        }

        if(!empty($search = $request->get('search'))) {
            if(strpos($search, '%') === false) {
                $search = '%' . $search . '%';
            }
            if(!in_array('g', $joins)) {
                $qb = $qb->leftJoin('u.groups', 'g');
                $joins[] = 'g';
            }
            $qb = $qb->andWhere('u.first LIKE :search OR u.last LIKE :search OR u.email LIKE :search OR g.name LIKE :search OR g.description LIKE :search')
                ->setParameter('search', $search);
        }

        $role = $request->get('role');
        if($role != 'ROLE_GUEST') {
            $qb = $qb->andWhere('u.roles NOT LIKE \'%s:10:"ROLE_GUEST"%\'');
        }
        if($role != 'ROLE_DEMO') {
            $qb = $qb->andWhere('u.roles NOT LIKE \'%s:9:"ROLE_DEMO"%\'');
        }
        if($role == 'ROLE_STUDENT') {
            $qb = $qb->andWhere('u.roles NOT LIKE \'%s:12:"ROLE_ADVISER"%\' AND u.roles NOT LIKE \'%s:19:"ROLE_MASTER_ADVISER"%\' AND u.roles NOT LIKE \'%s:12:"ROLE_PARTNER"%\' AND u.roles NOT LIKE \'%s:11:"ROLE_PARENT"%\'');
        }
        elseif($role == 'ROLE_PAID') {
            if(!in_array('g', $joins)) {
                $qb = $qb->leftJoin('u.groups', 'g');
                $joins[] = 'g';
            }
            $qb = $qb->andWhere('u.roles LIKE \'%s:9:"ROLE_PAID"%\' OR g.id IN (' . self::$paidStr . ')');
        }
        elseif(!empty($role)) {
            $qb = $qb->andWhere('u.roles LIKE \'%s:' . strlen($role) . ':"' . $role . '"%\'');
        }

        if(!empty($group = $request->get('group'))) {
            if(!in_array('g', $joins)) {
                $qb = $qb->leftJoin('u.groups', 'g');
                $joins[] = 'g';
            }
            if($group == 'nogroup') {
                $qb = $qb->andWhere('g.id IS NULL');
            }
            else {
                $qb = $qb->andWhere('g.id=:gid')->setParameter('gid', intval($group));
            }
        }

        if(!empty($last = $request->get('last'))) {
            $qb = $qb->andWhere('u.last LIKE \'' . $last . '\'');
        }

        if(!empty($completed = $request->get('completed'))) {
            if(!in_array('c1', $joins)) {
                $qb = $qb
                    ->leftJoin('u.course1s', 'c1')
                    ->leftJoin('u.course2s', 'c2')
                    ->leftJoin('u.course3s', 'c3');
                $joins[] = 'c1';
            }
            if(($pos = strpos($completed, '1')) !== false) {
                if(substr($completed, $pos - 1, 1) != '!')
                    $qb = $qb->andWhere('c1.lesson1=4 AND c1.lesson2=4 AND c1.lesson3=4 AND c1.lesson4=4 AND c1.lesson5=4 AND c1.lesson6=4');
                else
                    $qb = $qb->andWhere('(c1.lesson1<4 OR c1.lesson1 IS NULL) OR (c1.lesson2<4 OR c1.lesson2 IS NULL) OR (c1.lesson3<4 OR c1.lesson3 IS NULL) OR (c1.lesson4<4 OR c1.lesson4 IS NULL) OR (c1.lesson5<4 OR c1.lesson5 IS NULL) OR (c1.lesson6<4 OR c1.lesson6 IS NULL)');
            }
            if(($pos = strpos($completed, '2')) !== false) {
                if(substr($completed, $pos - 1, 1) != '!')
                    $qb = $qb->andWhere('c2.lesson1=4 AND c2.lesson2=4 AND c2.lesson3=4 AND c2.lesson4=4 AND c2.lesson5=4');
                else
                    $qb = $qb->andWhere('(c2.lesson1<4 OR c2.lesson1 IS NULL) OR (c2.lesson2<4 OR c2.lesson2 IS NULL) OR (c2.lesson3<4 OR c2.lesson3 IS NULL) OR (c2.lesson4<4 OR c2.lesson4 IS NULL) OR (c2.lesson5<4 OR c2.lesson5 IS NULL)');
            }
            if(($pos = strpos($completed, '3')) !== false) {
                if(substr($completed, $pos - 1, 1) != '!')
                    $qb = $qb->andWhere('c3.lesson1=4 AND c3.lesson2=4 AND c3.lesson3=4 AND c3.lesson4=4 AND c3.lesson5=4');
                else
                    $qb = $qb->andWhere('(c3.lesson1<4 OR c3.lesson1 IS NULL) OR (c3.lesson2<4 OR c3.lesson2 IS NULL) OR (c3.lesson3<4 OR c3.lesson3 IS NULL) OR (c3.lesson4<4 OR c3.lesson4 IS NULL) OR (c3.lesson5<4 OR c3.lesson5 IS NULL)');
            }
        }


        // check for individual lesson filters
        for($i = 1; $i <= 17; $i++) {
            if(!empty($lesson = $request->get('lesson' . $i))) {
                if (!in_array('c1', $joins)) {
                    $qb = $qb
                        ->leftJoin('u.course1s', 'c1')
                        ->leftJoin('u.course2s', 'c2')
                        ->leftJoin('u.course3s', 'c3');
                    $joins[] = 'c1';
                }
                if($i > 12) {
                    $l = $i - 12;
                    $c = 3;
                }
                elseif($i > 7) {
                    $l = $i - 7;
                    $c = 2;
                }
                else {
                    $l = $i;
                    $c = 1;
                }
                if($lesson == 'yes') {
                    $qb = $qb->andWhere('c' . $c . '.lesson' . $l . '=4');
                }
                else {
                    $qb = $qb->andWhere('c' . $c . '.lesson' . $l . '<4 OR ' . 'c' . $c . '.lesson' . $l . ' IS NULL');
                }
            }
        }

        if(!empty($paid = $request->get('paid'))) {
            if(!in_array('g', $joins)) {
                $qb = $qb->leftJoin('u.groups', 'g');
                $joins[] = 'g';
            }
            if($paid == 'yes') {
                $qb = $qb->andWhere('u.roles LIKE \'%s:9:"ROLE_PAID"%\' OR g.id IN (' . self::$paidStr . ')');
            }
            else {
                $qb = $qb->andWhere('u.roles NOT LIKE \'%s:9:"ROLE_PAID"%\' AND (g IS NULL OR g.id NOT IN (' . self::$paidStr . '))');
            }
        }

        if(!empty($goals = $request->get('goals'))) {
            if(!in_array('goals', $joins)) {
                $qb = $qb->leftJoin('u.goals', 'goals');
                $joins[] = 'goals';
            }
            if($goals == 'yes') {
                $qb = $qb->andWhere('goals.id IS NOT NULL');
            }
            else {
                $qb = $qb->andWhere('goals.id IS NULL');
            }
        }

        if(!empty($deadlines = $request->get('deadlines'))) {
            if(!in_array('deadlines', $joins)) {
                $qb = $qb->leftJoin('u.deadlines', 'deadlines');
                $joins[] = 'deadlines';
            }
            if($deadlines == 'yes') {
                $qb = $qb->andWhere('deadlines.id IS NOT NULL');
            }
            else {
                $qb = $qb->andWhere('deadlines.id IS NULL');
            }
        }

        if(!empty($schedules = $request->get('schedules'))) {
            if(!in_array('schedules', $joins)) {
                $qb = $qb->leftJoin('u.schedules', 'schedules');
                $joins[] = 'schedules';
            }
            if($schedules == 'yes') {
                $qb = $qb->andWhere('schedules.university IS NOT NULL AND schedules.university!=\'\'');
            }
            else {
                $qb = $qb->andWhere('schedules.university IS NULL OR schedules.university=\'\'');
            }
        }

        if(!empty($grades = $request->get('grades'))) {
            if(!in_array('schedules', $joins)) {
                $qb = $qb->leftJoin('u.schedules', 'schedules');
                $joins[] = 'schedules';
            }
            if(!in_array('grades', $joins)) {
                $qb = $qb->leftJoin('schedules.courses', 'courses');
                $qb = $qb->leftJoin('courses.grades', 'grades');
                $joins[] = 'grades';
            }
            if($grades == 'yes') {

                $qb = $qb->andWhere('grades.assignment IS NOT NULL AND grades.assignment!=\'\'');
            }
            else {
                $qb = $qb->andWhere('grades.assignment IS NULL OR grades.assignment=\'\'');
            }
        }

        if(!empty($notes = $request->get('notes'))) {
            if($notes == 'yes') {
                $qb = $qb->andWhere('u.evernote_access_token IS NOT NULL AND u.evernote_access_token!=\'\'');
            }
            else {
                $qb = $qb->andWhere('u.evernote_access_token IS NULL OR u.evernote_access_token=\'\'');
            }
        }

        if(!empty($partners = $request->get('partners'))) {
            if(!in_array('partners', $joins)) {
                $qb = $qb->leftJoin('u.partnerInvites', 'partners');
                $joins[] = 'partners';
            }
            if($partners == 'yes') {
                $qb = $qb->andWhere('partners.id IS NOT NULL');
            }
            else {
                $qb = $qb->andWhere('partners.id IS NULL');
            }
        }

        return $qb;
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function indexAction(Request $request)
    {
        set_time_limit(0);
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        // count total so we know the max pages
        $total = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->getQuery()
            ->getSingleScalarResult();

        // max pagination to search count
        if(!empty($page = $request->get('page'))) {
            if($page == 'last') {
                $page = $total / 25;
            }
            $resultOffset = (min(max(1, ceil($total / 25)), max(1, intval($page))) - 1) * 25;
        }
        else {
            $resultOffset = 0;
        }

        // get the actual list of users
        /** @var QueryBuilder $users */
        $users = self::searchBuilder($orm, $request, $joins)->distinct(true)->select('u');

        // figure out how to sort
        if(!empty($order = $request->get('order'))) {
            $field = explode(' ', $order)[0];
            $direction = explode(' ', $order)[1];
            if($direction != 'ASC' && $direction != 'DESC')
                $direction = 'DESC';
            // no extra join information needed
            if($field == 'created' || $field == 'lastLogin' || $field == 'lastVisit' || $field == 'last') {
                $users = $users->orderBy('u.' . $field, $direction);
            }
            if($field == 'completed') {
                if(!in_array('c1', $joins)) {
                    $users = $users
                        ->leftJoin('u.course1s', 'c1')
                        ->leftJoin('u.course2s', 'c2')
                        ->leftJoin('u.course3s', 'c3');
                }
                $users = $users
                    ->addOrderBy('c1.lesson1 + c1.lesson2 + c1.lesson3 + c1.lesson4 + c1.lesson5 + c1.lesson6 + c1.lesson7 + c2.lesson1 + c2.lesson2 + c2.lesson3 + c2.lesson4 + c2.lesson5 + c3.lesson1 + c3.lesson2 + c3.lesson3 + c3.lesson4 + c3.lesson5', $direction)
                    ->addOrderBy('c1.lesson1 + c1.lesson2 + c1.lesson3 + c1.lesson4 + c1.lesson5 + c1.lesson6 + c1.lesson7', $direction)
                    ->addOrderBy('c2.lesson1 + c2.lesson2 + c2.lesson3 + c2.lesson4 + c2.lesson5', $direction)
                    ->addOrderBy('c3.lesson1 + c3.lesson2 + c3.lesson3 + c3.lesson4 + c3.lesson5', $direction);
                $joins[] = 'c1';
            }
        }
        else {
            $users = $users->orderBy('u.lastVisit', 'DESC');
        }

        $users = $users
            ->setFirstResult($resultOffset)
            ->setMaxResults(25)
            ->getQuery()
            ->getResult();


        // get all the interesting aggregate counts
        $yesterday = new \DateTime('yesterday');
        $signups = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.created > :yesterday')
            ->setParameter('yesterday', $yesterday)
            ->getQuery()
            ->getSingleScalarResult();

        $visitors = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.lastVisit > :yesterday')
            ->setParameter('yesterday', $yesterday)
            ->getQuery()
            ->getSingleScalarResult();

        $parents = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.roles LIKE \'%s:11:"ROLE_PARENT"%\'')
            ->getQuery()
            ->getSingleScalarResult();

        $partners = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.roles LIKE \'%s:12:"ROLE_PARTNER"%\'')
            ->getQuery()
            ->getSingleScalarResult();

        $advisers = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.roles LIKE \'%s:12:"ROLE_ADVISER"%\' OR u.roles LIKE \'%s:19:"ROLE_MASTER_ADVISER"%\'')
            ->getQuery()
            ->getSingleScalarResult();

        $students = self::searchBuilder($orm, $request)
            ->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.roles NOT LIKE \'%s:12:"ROLE_ADVISER"%\'')
            ->andWhere('u.roles NOT LIKE \'%s:19:"ROLE_MASTER_ADVISER"%\'')
            ->andWhere('u.roles NOT LIKE \'%s:12:"ROLE_PARTNER"%\'')
            ->andWhere('u.roles NOT LIKE \'%s:11:"ROLE_PARENT"%\'')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $torch */
        $torch = self::searchBuilder($orm, $request, $joins);
        if(!in_array('g', $joins)) {
            $torch = $torch->leftJoin('u.groups', 'g');
        }
        $torch = $torch->select('COUNT(DISTINCT u.id)')
            ->andWhere('g.name LIKE \'%torch%\'')
            ->getQuery()
            ->getSingleScalarResult();
        /** @var int $torch */

        /** @var QueryBuilder $csa */
        $csa = self::searchBuilder($orm, $request, $joins);
        if(!in_array('g', $joins)) {
            $csa = $csa->leftJoin('u.groups', 'g');
        }
        $csa = $csa->select('COUNT(DISTINCT u.id)')
            ->andWhere('g.name LIKE \'%csa%\'')
            ->getQuery()
            ->getSingleScalarResult();
        /** @var int $csa */

        /** @var QueryBuilder $paid */
        $paid = self::searchBuilder($orm, $request, $joins);
        if(!in_array('g', $joins)) {
            $paid = $paid->leftJoin('u.groups', 'g');
        }
        $paid = $paid->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.roles LIKE \'%s:9:"ROLE_PAID"%\' OR g.id IN (' . self::$paidStr . ')')
            ->getQuery()
            ->getSingleScalarResult();
        /** @var int $paid */

        /** @var QueryBuilder $completed */
        $completed = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) {
            $completed = $completed
                ->leftJoin('u.course1s', 'c1')
                ->leftJoin('u.course2s', 'c2')
                ->leftJoin('u.course3s', 'c3');
        }
        $completed = $completed->select('COUNT(DISTINCT u.id)')
            ->andWhere('c1.lesson1=4 AND c1.lesson2=4 AND c1.lesson3=4 AND c1.lesson4=4 AND c1.lesson5=4 AND c1.lesson6=4')
            ->andWhere('c2.lesson1=4 AND c2.lesson2=4 AND c2.lesson3=4 AND c2.lesson4=4 AND c2.lesson5=4')
            ->andWhere('c3.lesson1=4 AND c3.lesson2=4 AND c3.lesson3=4 AND c3.lesson4=4 AND c3.lesson5=4')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $c1l1 */
        $c1l1 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l1 = $c1l1->leftJoin('u.course1s', 'c1'); }
        $c1l1 = $c1l1->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l2 */
        $c1l2 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l2 = $c1l2->leftJoin('u.course1s', 'c1'); }
        $c1l2 = $c1l2->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson2=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l3 */
        $c1l3 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l3 = $c1l3->leftJoin('u.course1s', 'c1'); }
        $c1l3 = $c1l3->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson3=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l4 */
        $c1l4 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l4 = $c1l4->leftJoin('u.course1s', 'c1'); }
        $c1l4 = $c1l4->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson4=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l5 */
        $c1l5 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l5 = $c1l5->leftJoin('u.course1s', 'c1'); }
        $c1l5 = $c1l5->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson5=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l6 */
        $c1l6 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l6 = $c1l6->leftJoin('u.course1s', 'c1'); }
        $c1l6 = $c1l6->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson6=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c1l7 */
        $c1l7 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c1l7 = $c1l7->leftJoin('u.course1s', 'c1'); }
        $c1l7 = $c1l7->select('COUNT(DISTINCT u.id)')->andWhere('c1.lesson7=4')->getQuery()->getSingleScalarResult();

        /** @var QueryBuilder $c2l1 */
        $c2l1 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c2l1 = $c2l1->leftJoin('u.course2s', 'c2'); }
        $c2l1 = $c2l1->select('COUNT(DISTINCT u.id)')->andWhere('c2.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c2l2 */
        $c2l2 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c2l2 = $c2l2->leftJoin('u.course2s', 'c2'); }
        $c2l2 = $c2l2->select('COUNT(DISTINCT u.id)')->andWhere('c2.lesson2=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c2l3 */
        $c2l3 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c2l3 = $c2l3->leftJoin('u.course2s', 'c2'); }
        $c2l3 = $c2l3->select('COUNT(DISTINCT u.id)')->andWhere('c2.lesson3=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c2l4 */
        $c2l4 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c2l4 = $c2l4->leftJoin('u.course2s', 'c2'); }
        $c2l4 = $c2l4->select('COUNT(DISTINCT u.id)')->andWhere('c2.lesson4=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c2l5 */
        $c2l5 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c2l5 = $c2l5->leftJoin('u.course2s', 'c2'); }
        $c2l5 = $c2l5->select('COUNT(DISTINCT u.id)')->andWhere('c2.lesson5=4')->getQuery()->getSingleScalarResult();


        /** @var QueryBuilder $c3l1 */
        $c3l1 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c3l1 = $c3l1->leftJoin('u.course3s', 'c3'); }
        $c3l1 = $c3l1->select('COUNT(DISTINCT u.id)')->andWhere('c3.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c3l2 */
        $c3l2 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c3l2 = $c3l2->leftJoin('u.course3s', 'c3'); }
        $c3l2 = $c3l2->select('COUNT(DISTINCT u.id)')->andWhere('c3.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c3l3 */
        $c3l3 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c3l3 = $c3l3->leftJoin('u.course3s', 'c3'); }
        $c3l3 = $c3l3->select('COUNT(DISTINCT u.id)')->andWhere('c3.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c3l4 */
        $c3l4 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c3l4 = $c3l4->leftJoin('u.course3s', 'c3'); }
        $c3l4 = $c3l4->select('COUNT(DISTINCT u.id)')->andWhere('c3.lesson1=4')->getQuery()->getSingleScalarResult();
        /** @var QueryBuilder $c3l5 */
        $c3l5 = self::searchBuilder($orm, $request, $joins);
        if(!in_array('c1', $joins)) { $c3l5 = $c3l5->leftJoin('u.course3s', 'c3'); }
        $c3l5 = $c3l5->select('COUNT(DISTINCT u.id)')->andWhere('c3.lesson1=4')->getQuery()->getSingleScalarResult();


        /** @var QueryBuilder $goals */
        $goals = self::searchBuilder($orm, $request, $joins);
        if(!in_array('goals', $joins)) {
            $goals = $goals->leftJoin('u.goals', 'goals');
        }
        $goals = $goals->select('COUNT(DISTINCT u.id)')
            ->andWhere('goals.id IS NOT NULL')
            ->getQuery()
            ->getSingleScalarResult();


        /** @var QueryBuilder $deadlines */
        $deadlines = self::searchBuilder($orm, $request, $joins);
        if(!in_array('deadlines', $joins)) {
            $deadlines = $deadlines->leftJoin('u.deadlines', 'deadlines');
        }
        $deadlines = $deadlines->select('COUNT(DISTINCT u.id)')
            ->andWhere('deadlines.id IS NOT NULL')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $schedules */
        $schedules = self::searchBuilder($orm, $request, $joins);
        if(!in_array('schedules', $joins)) {
            $schedules = $schedules->leftJoin('u.schedules', 'schedules');
        }
        $schedules = $schedules->select('COUNT(DISTINCT u.id)')
            ->andWhere('schedules.university IS NOT NULL AND schedules.university!=\'\'')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $grades */
        $grades = self::searchBuilder($orm, $request, $joins);
        if(!in_array('schedules', $joins)) {
            $grades = $grades->leftJoin('u.schedules', 'schedules');
        }
        if(!in_array('grades', $joins)) {
            $grades = $grades->leftJoin('schedules.courses', 'courses');
            $grades = $grades->leftJoin('courses.grades', 'grades');
        }
        $grades = $grades->select('COUNT(DISTINCT u.id)')
            ->andWhere('grades.assignment IS NOT NULL AND grades.assignment!=\'\'')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $partnerTotal */
        $partnerTotal = self::searchBuilder($orm, $request, $joins);
        if(!in_array('partners', $joins)) {
            $partnerTotal = $partnerTotal->leftJoin('u.partnerInvites', 'partners');
        }
        $partnerTotal = $partnerTotal->select('COUNT(DISTINCT u.id)')
            ->andWhere('partners.id IS NOT NULL')
            ->getQuery()
            ->getSingleScalarResult();

        /** @var QueryBuilder $notes */
        $notes = self::searchBuilder($orm, $request, $joins);
        $notes = $notes->select('COUNT(DISTINCT u.id)')
            ->andWhere('u.evernote_access_token IS NOT NULL AND u.evernote_access_token!=\'\'')
            ->getQuery()
            ->getSingleScalarResult();

        // get the groups for use in dropdown
        $groups = $orm->getRepository('StudySauceBundle:Group')->findAll();

        return $this->render('AdminBundle:Admin:tab.html.php', [
                'groups' => $groups,
                'users' => $users,
                'visitors' => $visitors,
                'signups' => $signups,
                'parents' => $parents,
                'partners' => $partners,
                'advisers' => $advisers,
                'paid' => $paid,
                'students' => $students,
                'torch' => $torch,
                'csa' => $csa,
                'completed' => $completed,
                'goals' => $goals,
                'deadlines' => $deadlines,
                'schedules' => $schedules,
                'grades' => $grades,
                'partnerTotal' => $partnerTotal,
                'notes' => $notes,
                'total' => $total,
                'c1l1' => $c1l1,
                'c1l2' => $c1l2,
                'c1l3' => $c1l3,
                'c1l4' => $c1l4,
                'c1l5' => $c1l5,
                'c1l6' => $c1l6,
                'c1l7' => $c1l7,
                'c2l1' => $c2l1,
                'c2l2' => $c2l2,
                'c2l3' => $c2l3,
                'c2l4' => $c2l4,
                'c2l5' => $c2l5,
                'c3l1' => $c3l1,
                'c3l2' => $c3l2,
                'c3l3' => $c3l3,
                'c3l4' => $c3l4,
                'c3l5' => $c3l5
            ]);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function addUserAction(Request $request)
    {

        /** @var $user User */
        $user = $this->getUser();
        if (!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        $account = new AccountController();
        $account->setContainer($this->container);
        $account->createAction($request, false, false);

        return $this->indexAction($request);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function saveUserAction(Request $request) {

        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        /** @var User $u */
        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        if(!empty($request->get('users')))
        {
            foreach($request->get('users') as $user) {
                $u = $orm->getRepository('StudySauceBundle:User')->findOneBy(['id' => $user['userId']]);
                if(empty($u)) {
                    continue;
                }

                if(!empty($first = $user['firstName']))
                    $u->setFirst($first);
                if(!empty($last = $user['lastName']))
                    $u->setLast($last);
                if(!empty($email = $user['email'])) {
                    $u->setUsername($email);
                    $u->setEmail($email);
                    $userManager->updateCanonicalFields($u);
                }

                // add new groups
                $groups = $u->getGroups()->map(function (Group $g) {return $g->getId();})->toArray();
                $newGroups = explode(',', $user['groups']);
                // intersection with current groups is a removal, intersection with request is an addition
                foreach(array_diff($groups, $newGroups) as $i => $id) {
                    $u->removeGroup($u->getGroups()->filter(function (Group $g) use ($id) {return $g->getId() == $id;})->first());
                }
                foreach(array_diff($newGroups, $groups) as $i => $id) {
                    /** @var Group $g */
                    $g = $orm->getRepository('StudySauceBundle:Group')->findOneBy(['id' => $id]);
                    if(!empty($g))
                        $u->addGroup($g);
                }

                // add new roles
                $roles = $u->getRoles();
                $newRoles = explode(',', $user['roles']);
                // intersection with current groups is a removal, intersection with request is an addition
                foreach(array_diff($roles, $newRoles) as $i => $role) {
                    $u->removeRole($role);
                }
                foreach(array_diff($newRoles, $roles) as $i => $role) {
                    $u->addRole($role);
                }
                $userManager->updateUser($u);
            }
        }

        return $this->indexAction($request);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function saveGroupAction(Request $request) {

        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        /** @var Group $g */
        if(empty($request->get('groupId'))) {
            $g = new Group();
        }
        else {
            $g = $orm->getRepository('StudySauceBundle:Group')->findOneBy(['id' => $request->get('groupId')]);
        }

        if(!empty($name = $request->get('groupName')))
            $g->setName($name);
        $g->setDescription(!empty($request->get('description')) ? $request->get('description') : '');

        // add new roles
        $roles = $g->getRoles();
        $newRoles = explode(',', $request->get('roles'));
        // intersection with current groups is a removal, intersection with request is an addition
        foreach(array_diff($roles, $newRoles) as $i => $role) {
            $g->removeRole($role);
        }
        foreach(array_diff($newRoles, $roles) as $i => $role) {
            $g->addRole($role);
        }

        if(empty($g->getId()))
            $orm->persist($g);
        elseif($g->getName() == '_remove') {
            // remove group from users
            foreach($g->getUsers()->toArray() as $i => $u) {
                /** @var User $u */
                $u->removeGroup($g);
                $g->removeUser($u);
                $userManager->updateUser($u, false);
            }
            $invites = $orm->getRepository('StudySauceBundle:GroupInvite')->findBy(['group' => $request->get('groupId')]);
            foreach($invites as $i => $in) {
                $orm->remove($in);
            }
            $coupons = $orm->getRepository('StudySauceBundle:Coupon')->findBy(['group' => $request->get('groupId')]);
            foreach($coupons as $i => $c) {
                /** @var Coupon $c */
                $c->setGroup(null);
                $orm->merge($c);
            }
            $orm->remove($g);
        }
        else
            $orm->merge($g);
        $orm->flush();

        return $this->indexAction($request);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function resetUserAction(Request $request) {

        /** @var $userManager UserManager */
        $userManager = $this->get('fos_user.user_manager');
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        /** @var User $u */
        $u = $orm->getRepository('StudySauceBundle:User')->findOneBy(['id' => $request->get('userId')]);
        if(!empty($u)) {

            if ($u->isPasswordRequestNonExpired($this->container->getParameter('fos_user.resetting.token_ttl'))) {
                // TODO: error?
            }

            if (null === $u->getConfirmationToken()) {
                /** @var $tokenGenerator \FOS\UserBundle\Util\TokenGeneratorInterface */
                $tokenGenerator = $this->get('fos_user.util.token_generator');
                $u->setConfirmationToken($tokenGenerator->generateToken());
            }

            $emails = new StudySauceEmails();
            $emails->setContainer($this->container);
            $emails->resetPasswordAction($u);
            $u->setPasswordRequestedAt(new \DateTime());
            $userManager->updateUser($u);
        }

        return $this->indexAction($request);
    }

    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function cancelUserAction(Request $request) {

        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        /** @var User $u */
        $u = $orm->getRepository('StudySauceBundle:User')->findOneBy(['id' => $request->get('userId')]);
        if(!empty($u)) {
            $buy = new BuyController();;
            $buy->setContainer($this->container);
            $buy->cancelPaymentAction($u);
        }

        return $this->indexAction($request);
    }


    /**
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function removeUserAction(Request $request) {

        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user User */
        $user = $this->getUser();
        if(!$user->hasRole('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException();
        }

        /** @var User $u */
        $u = $orm->getRepository('StudySauceBundle:User')->findOneBy(['id' => $request->get('userId')]);
        if(!empty($u)) {
            // remove all entities attached
            $orm->getRepository('StudySauceBundle:Visit')->createQueryBuilder('v')
                ->delete()
                ->andWhere('v.user = :uid')
                ->setParameter(':uid', $u)
                ->getQuery()->execute();
            foreach($u->getCourse1s()->toArray() as $i => $c1) {
                /** @var Course1 $c1 */
                foreach($c1->getQuiz1()->toArray() as $j => $q1) {
                    $c1->removeQuiz1($q1);
                    $orm->remove($q1);
                }
                foreach($c1->getQuiz2()->toArray() as $j => $q2) {
                    $c1->removeQuiz2($q2);
                    $orm->remove($q2);
                }
                foreach($c1->getQuiz3()->toArray() as $j => $q3) {
                    $c1->removeQuiz3($q3);
                    $orm->remove($q3);
                }
                foreach($c1->getQuiz4()->toArray() as $j => $q4) {
                    $c1->removeQuiz4($q4);
                    $orm->remove($q4);
                }
                foreach($c1->getQuiz5()->toArray() as $j => $q5) {
                    $c1->removeQuiz5($q5);
                    $orm->remove($q5);
                }
                foreach($c1->getQuiz6()->toArray() as $j => $q6) {
                    $c1->removeQuiz6($q6);
                    $orm->remove($q6);
                }
                $u->removeCourse1($c1);
                $orm->remove($c1);
            }
            foreach($u->getCourse2s()->toArray() as $i => $c2) {
                /** @var Course2 $c2 */
                foreach($c2->getInterleaving()->toArray() as $j => $q1) {
                    $c2->removeInterleaving($q1);
                    $orm->remove($q1);
                }
                foreach($c2->getStudyMetrics()->toArray() as $j => $q2) {
                    $c2->removeStudyMetric($q2);
                    $orm->remove($q2);
                }
                foreach($c2->getStudyPlan()->toArray() as $j => $q3) {
                    $c2->removeStudyPlan($q3);
                    $orm->remove($q3);
                }
                foreach($c2->getStudyTests()->toArray() as $j => $q4) {
                    $c2->removeStudyTest($q4);
                    $orm->remove($q4);
                }
                foreach($c2->getTestTaking()->toArray() as $j => $q5) {
                    $c2->removeTestTaking($q5);
                    $orm->remove($q5);
                }
                $u->removeCourse2($c2);
                $orm->remove($c2);
            }
            foreach($u->getCourse3s()->toArray() as $i => $c3) {
                /** @var Course3 $c3 */
                foreach($c3->getActiveReading()->toArray() as $j => $q1) {
                    $c3->removeActiveReading($q1);
                    $orm->remove($q1);
                }
                foreach($c3->getGroupStudy()->toArray() as $j => $q2) {
                    $c3->removeGroupStudy($q2);
                    $orm->remove($q2);
                }
                foreach($c3->getSpacedRepetition()->toArray() as $j => $q3) {
                    $c3->removeSpacedRepetition($q3);
                    $orm->remove($q3);
                }
                foreach($c3->getStrategies()->toArray() as $j => $q4) {
                    $c3->removeStrategy($q4);
                    $orm->remove($q4);
                }
                foreach($c3->getTeaching()->toArray() as $j => $q5) {
                    $c3->removeTeaching($q5);
                    $orm->remove($q5);
                }
                $u->removeCourse3($c3);
                $orm->remove($c3);
            }
            foreach($u->getMessages()->toArray() as $i => $m) {
                $u->removeMessage($m);
                $orm->remove($m);
            }
            foreach($u->getFiles()->toArray() as $i => $f) {
                $u->removeFile($f);
                $orm->remove($f);
            }
            foreach($u->getGoals()->toArray() as $i => $g) {
                /** @var Goal $g */
                foreach($g->getClaims()->toArray() as $j => $c) {
                    $g->removeClaim($c);
                    $orm->remove($c);
                }
                $u->removeGoal($g);
                $orm->remove($g);
            }
            foreach($u->getGroups()->toArray() as $i => $gr) {
                $u->removeGroup($gr);
            }
            foreach($u->getGroupInvites()->toArray() as $i => $gri) {
                $u->removeGroupInvite($gri);
                $orm->remove($gri);
            }
            foreach($u->getParentInvites()->toArray() as $i => $p) {
                $u->removeParentInvite($p);
                $orm->remove($p);
            }
            foreach($u->getPartnerInvites()->toArray() as $i => $pa) {
                $u->removePartnerInvite($pa);
                $orm->remove($pa);
            }
            foreach($u->getPayments()->toArray() as $i => $pay) {
                $u->removePayment($pay);
                $orm->remove($pay);
            }
            foreach($u->getSchedules()->toArray() as $i => $s) {
                /** @var Schedule $s */
                foreach ($s->getEvents()->toArray() as $j => $e) {
                    /** @var Event $e */
                    $s->removeEvent($e);
                    $orm->remove($e);
                }
            }
            $orm->flush();
            foreach($u->getDeadlines()->toArray() as $i => $d) {
                /** @var Deadline $d */
                $u->removeDeadline($d);
                if(!empty($d->getCourse())) {
                    $d->getCourse()->removeDeadline($d);
                }
                $orm->remove($d);
            }
            $orm->flush();
            foreach($u->getSchedules()->toArray() as $i => $s) {
                foreach($s->getCourses()->toArray() as $j => $co) {
                    /** @var Course $co */
                    foreach($co->getDeadlines()->toArray() as $d) {
                        $co->removeDeadline($d);
                        $orm->remove($d);
                    }
                    foreach($co->getCheckins()->toArray() as $k => $ch) {
                        $co->removeCheckin($ch);
                        $orm->remove($ch);
                    }
                    foreach($co->getGrades()->toArray() as $gr) {
                        $co->removeGrade($gr);
                        $orm->remove($gr);
                    }
                    $s->removeCourse($co);
                    $orm->remove($co);
                }
                $u->removeSchedule($s);
                $orm->remove($s);
            }
           foreach($u->getStudentInvites()->toArray() as $i => $st) {
                $u->removeStudentInvite($st);
                $orm->remove($st);
            }
            foreach($u->getInvitedStudents()->toArray() as $i => $is) {
                $u->removeInvitedStudent($is);
                $orm->remove($is);
            }
            foreach($u->getInvitedPartners()->toArray() as $i => $ip) {
                $u->removeInvitedPartner($ip);
                $orm->remove($ip);
            }
            foreach($u->getInvitedParents()->toArray() as $i => $ipa) {
                $u->removeInvitedParent($ipa);
                $orm->remove($ipa);
            }
            foreach($u->getInvitedGroups()->toArray() as $i => $ig) {
                $u->removeInvitedGroup($ig);
                $orm->remove($ig);
            }
            foreach($u->getNotes()->toArray() as $i => $n) {
                $u->removeNote($n);
                $orm->remove($n);
            }
            $orm->remove($u);
            $orm->flush();
        }

        return $this->indexAction($request);
    }
}

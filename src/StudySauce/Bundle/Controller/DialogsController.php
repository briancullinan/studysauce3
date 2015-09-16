<?php

namespace StudySauce\Bundle\Controller;

use Doctrine\ORM\EntityManager;
use StudySauce\Bundle\Entity\ContactMessage;
use StudySauce\Bundle\Entity\Course;
use StudySauce\Bundle\Entity\ParentInvite;
use StudySauce\Bundle\Entity\Schedule;
use StudySauce\Bundle\Entity\StudentInvite;
use StudySauce\Bundle\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TorchAndLaurel\Bundle\Controller\EmailsController as TorchEmailsController;

/**
 * Class DialogsController
 * @package StudySauce\Bundle\Controller
 */
class DialogsController extends Controller
{
    /**
     * @param string $template
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function deferredAction($template)
    {
        return $this->render('StudySauceBundle:Dialogs:' . $template . '.html.php', ['id' => $template]);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function contactSendAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var $user \StudySauce\Bundle\Entity\User */
        $user = $this->getUser();

        // save the invite
        $contact = new ContactMessage();
        if($user != 'anon.' && !$user->hasRole('ROLE_GUEST') && !$user->hasRole('ROLE_DEMO')) {
            $contact->setUser($user);
        }
        $contact->setName($request->get('name'));
        $contact->setEmail($request->get('email'));
        $contact->setMessage(str_replace(["\n"], ['<br />'], $request->get('message')));
        $orm->persist($contact);
        $orm->flush();

        $email = new EmailsController();
        $email->setContainer($this->container);
        $email->contactMessageAction($user, $contact);

        return new JsonResponse(true);
    }

    /**
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function sdsMessagesAction()
    {
        // get the total number of checkins

        /** @var $user \StudySauce\Bundle\Entity\User */
        $user = $this->getUser();

        /** @var $schedule Schedule */
        $schedule = $user->getSchedules()->first() ?: new Schedule();

        $count = array_sum($schedule->getClasses()->map(function (Course $c) {return $c->getCheckins()->count();})->toArray());
        return $this->render('StudySauceBundle:Dialogs:sds-messages.html.php', ['id' => 'sds-messages', 'count' => $count]);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function billParentsSendAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var $user \StudySauce\Bundle\Entity\User */
        $user = $this->getUser();
        $session = $request->getSession();

        // save the invite
        $bill = new ParentInvite();
        $bill->setUser($user);
        $bill->setFirst($request->get('first'));
        $bill->setLast($request->get('last'));
        $bill->setEmail($request->get('email'));
        $bill->setCode(md5(microtime()));
        if(!is_object($user) || $user->hasRole('ROLE_GUEST') || $user->hasRole('ROLE_DEMO')) {
            $bill->setFromFirst($request->get('yourFirst'));
            $bill->setFromLast($request->get('yourLast'));
            $bill->setFromEmail($request->get('yourEmail'));
            // temporary user for sending email
            $user = new User();
            $user->setFirst($request->get('yourFirst'));
            $user->setLast($request->get('yourLast'));
            $user->setEmail($request->get('yourEmail'));
            $session->set('invite', $bill->getCode());
        }
        else {
            $bill->setFromFirst($request->get('yourFirst'));
            $bill->setFromLast($request->get('yourLast'));
            $bill->setFromEmail($request->get('yourEmail'));
        }
        $orm->persist($bill);
        $orm->flush();
        // TODO: generalize this for other groups
        $group = $orm->getRepository('StudySauceBundle:GroupInvite')->findOneBy(['code' => $request->get('_code')]);
        if(!empty($group) && $group->getGroup()->getName() == 'Torch And Laurel' ||
            ($session->has('organization') && $session->get('organization') == 'Torch And Laurel') ||
            $user->hasGroup('Torch And Laurel')) {
            $email = new TorchEmailsController();
            $email->setContainer($this->container);
            $email->parentPayAction($user, $bill);
        }
        else {
            $email = new EmailsController();
            $email->setContainer($this->container);
            $email->parentPayAction($user, $bill);
        }

        return new JsonResponse(true);
    }

    /**
     * @param Request $request
     * @return JsonResponse
     */
    public function inviteStudentSendAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var $user \StudySauce\Bundle\Entity\User */
        $user = $this->getUser();
        $session = $request->getSession();

        // save the invite
        $student = new StudentInvite();
        $student->setUser($user);
        $student->setFirst($request->get('first'));
        $student->setLast($request->get('last'));
        $student->setEmail($request->get('email'));
        $student->setCode(md5(microtime()));
        if(!is_object($user) || $user->hasRole('ROLE_GUEST') || $user->hasRole('ROLE_DEMO')) {
            $student->setFromFirst($request->get('yourFirst'));
            $student->setFromLast($request->get('yourLast'));
            $student->setFromEmail($request->get('yourEmail'));
            // temporary user for sending email
            $user = new User();
            $user->setFirst($request->get('yourFirst'));
            $user->setLast($request->get('yourLast'));
            $user->setEmail($request->get('yourEmail'));
            $session->set('invite', $student->getCode());
        }
        else {
            $student->setFromFirst($user->getFirst());
            $student->setFromLast($user->getLast());
            $student->setFromEmail($user->getEmail());
        }
        $orm->persist($student);
        $orm->flush();
        // TODO: generalize this for other groups
        $group = $orm->getRepository('StudySauceBundle:GroupInvite')->findOneBy(['code' => $request->get('_code')]);
        if(!empty($group) && $group->getGroup()->getName() == 'Torch And Laurel' ||
            ($session->has('organization') && $session->get('organization') == 'Torch And Laurel') ||
            $user->hasGroup('Torch And Laurel')) {
            $email = new TorchEmailsController();
            $email->setContainer($this->container);
            $email->studentInviteAction($user, $student);
        }
        else {
            $email = new EmailsController();
            $email->setContainer($this->container);
            $email->studentInviteAction($user, $student);
        }

        return new JsonResponse(true);
    }

}
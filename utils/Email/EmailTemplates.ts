import {objectType} from "nexus";

export type EmailTemplate = {
	subject: string;
	body: string;
};

export const EMAIL_TEMPLATES = {
	HAZARDS_CAE: {
		subject: `[Workflow AxS] Modification d’un local dangereux`,
		body: `Bonjour,<br/><br/>
A la suite d’un changement dans LHD, par {{modifiedByName}} le {{modifiedOn}}, le
danger dans le local ci-dessous a été modifié :<br/>
• <b>Local</b> : {{room}}<br/>
• <b>Statut</b> : {{action.fr}}<br/>
• <b>Type de danger</b> : {{hazardType}}<br/>
• <b>Lien vers LHD</b> : <a href="${process.env.APP_BASE_PATH}/roomdetails?room={{room}}">{{room}}</a><br/>
• <b>Commentaires</b> : <i>{{comments}}</i><br/><br/>
Nous vous remercions de bien vouloir faire les changements nécessaires dans AxS.<br/><br/>
Pour rappel, voici les étapes qui sont importantes de ne pas oublier :<br/>
• Mettre à jour le local dans le workflow AxS<br/>
• Mettre à jour le local dans le groupe de porte de l’entreprise de nettoyage (i.e. Pour les P2 : ajout/suppression dans le groupe ORANGE)<br/>
• Mettre à jour le local dans les groupes de portes et profils concernés<br/>
• Mettre à jour si nécessaire les lecteurs offlines<br/>
• Confirmer à la personne d’OHS en copie que c’est à jour.<br/><br/>
En cas de questions, merci de contacter la personne en copie de ce message.<br/>
Merci d’avance,<br/>
Support OHS`,
	},
	HAZARDS_COSEC: {
		subject: `[Fiche de porte] Mise à jour nécessaire / Update needed`,
		body: `<i>------ ENGLISH BELOW ------</i><br/><br/>
Bonjour,<br/><br/>
A la suite d’un changement dans LHD, par {{modifiedByName}} de l’équipe OHS-PR, le {{modifiedOn}}, le niveau de danger du local ci-dessous a été modifié :<br/>
• <b>Local</b> : {{room}}<br/>
• <b>Statut</b> : {{action.fr}}<br/>
• <b>Type de danger</b> : {{hazardType}}<br/><br/>
Nous vous prions de bien vouloir vérifier et mettre à jour la fiche de porte du local dans CRISTAL.
Vous pouvez vous connecter ici : <a href="https://cristal.epfl.ch/">CRISTAL</a>.<br/><br/>
En cas de questions, veuillez ouvrir ticket via <a href="https://go.epfl.ch/support-ohs">support-ohs</a><br/>
Nous vous remercions de votre collaboration,<br/>
Support OHS<br/><br/><br/>
-------------------------------------------------------------<br/><br/>
Dear COSEC,<br/><br/>
Following a change in LHD, by {{modifiedByName}} from the OHS-PR team, on {{modifiedOn}}, the hazard level of the room below has been updated:<br/>
• <b>Room</b>: {{room}}<br/>
• <b>Status</b>: {{action.en}}<br/>
• <b>Hazard type</b>: {{hazardType}}<br/><br/>
We kindly ask you to check and update the door sign of the room in CRISTAL. You can log in here: <a href="https://cristal.epfl.ch/">CRISTAL</a>.<br/><br/>
If you have any questions, please open a ticket via <a href="https://go.epfl.ch/support-ohs">support-ohs</a>.<br/>
Thank you for your cooperation,<br/>
OHS Support`,
	},
	CHEMICAL: {
		subject: 'LHD - Mise à jour de la table des produits chimiques sous autorisation',
		body: `Bonjour, <br/>
en pièce jointe vous pouvez trouver la liste des produits chimiques mise à jour.<br/>
Cordialement,<br/>
LHD`
	}
} as const satisfies Record<string, EmailTemplate>;

export function logRecipients (to: string[], cc: string[], bcc: string[]) {
	return `<b>TO</b>: ${to.join(', ')}<br/>
	<b>CC</b>: ${cc.join(', ')}<br/>
	<b>BCC</b>: ${bcc.join(', ')}<br/><br/>`
}

export function logAction (created: boolean, deleted: boolean) {
	if (created) return {'fr': 'Création', 'en': 'Created'};
	else if (deleted) return {'fr': 'Suppression', 'en': 'Deleted'};
	else return {'fr': 'Modification', 'en': 'Modified'};
}

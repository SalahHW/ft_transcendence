/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tailwindClasses.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:41:14 by edelarbr          #+#    #+#             */
/*   Updated: 2025/05/28 16:26:22 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export const COMMON_CLASSES = {
	primaryButton: /* CSS */ `bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-xl font-bold shadow-md transition duration-300`,
	secondaryButton:	/* CSS */ `inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`,
	pageContainer: /* CSS */ `container mx-auto p-4 h-[90vh] flex flex-col`,
	card: /* CSS */ `flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 min-h-[50vh]`,
	form: /* CSS */ `space-y-4`,
	input:	/* CSS */ `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500`,
	label:	/* CSS */ `block text-sm font-medium text-gray-700`,
};

// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <cashaddr.h>
#include <currencyunit.h>

#include <common/args.h>

void SetupCurrencyUnitOptions(ArgsManager &argsman) {
    // whether to use ausCash default unit and address prefix
    argsman.AddArg("-auscash",
                   strprintf("Use the ausCash address prefix (default: %s)",
                             cashaddr::DEFAULT_AUSCASH ? "true" : "false"),
                   ArgsManager::ALLOW_BOOL, OptionsCategory::OPTIONS);
    argsman.AddArg("-useausunit",
                   strprintf("Use the AUS unit (default: %s)",
                             DEFAULT_USE_AUS_UNIT ? "true" : "false"),
                   ArgsManager::ALLOW_BOOL, OptionsCategory::OPTIONS);
}

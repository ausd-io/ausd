# Copyright (c) 2017-2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

project(aus-seeder)

add_library(seeder-base
	bitcoin.cpp
	db.cpp
	dns.cpp
	options.cpp
)
target_link_libraries(seeder-base server)

add_executable(aus-seeder
	main.cpp
)
target_link_libraries(aus-seeder seeder-base)

include(BinaryTest)
add_to_symbols_check(aus-seeder)
add_to_security_check(aus-seeder)

include(InstallationHelper)
install_target(aus-seeder)

add_subdirectory(test)
